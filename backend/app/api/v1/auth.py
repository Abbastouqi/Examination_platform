"""Authentication endpoints: signup, login, refresh, Google OAuth, email
verification and password reset.

Mounted by main.py at `{API_V1_PREFIX}/auth`, so routes here are declared
without that prefix.
"""
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.logging import write_system_log
from app.core.ratelimit import rate_limit
from app.core.security import (
    create_access_token,
    create_purpose_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.mongo import get_db
from app.models.common import Role, utcnow
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.services.email import send_reset_email, send_verification_email
from app.utils.serialize import serialize

router = APIRouter()

# Google OAuth2 endpoints
_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
_GOOGLE_SCOPE = "openid email profile"


def _public_user(user: dict) -> dict:
    """Serialize a user doc for client output, stripping secrets."""
    safe = serialize(user)
    safe.pop("hashed_password", None)
    return safe


def _issue_tokens(user: dict) -> LoginResponse:
    user_id = str(user["_id"])
    role = user.get("role", Role.USER.value)
    return LoginResponse(
        access_token=create_access_token(user_id, role),
        refresh_token=create_refresh_token(user_id),
        user=_public_user(user),
    )


# --- Signup / Login --------------------------------------------------------
@router.post(
    "/signup",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("signup", 10, 3600))],
)
async def signup(payload: SignupRequest) -> LoginResponse:
    db = get_db()
    email = payload.email.lower()

    if await db.users.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    now = utcnow()
    doc = {
        "email": email,
        "hashed_password": hash_password(payload.password),
        "full_name": payload.full_name,
        "role": Role.USER.value,
        "is_active": True,
        "is_verified": False,
        "google_id": None,
        "avatar_url": None,
        "target_exams": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id

    token = create_purpose_token(str(result.inserted_id), "verify", hours=48)
    await send_verification_email(email, token)
    await write_system_log("INFO", f"New signup: {email}", source="auth", user_id=str(result.inserted_id))

    return _issue_tokens(doc)


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit("login", 15, 300))],
)
async def login(form: OAuth2PasswordRequestForm = Depends()) -> LoginResponse:
    db = get_db()
    email = form.username.lower()
    user = await db.users.find_one({"email": email})

    if not user or not user.get("hashed_password"):
        # No password set -> google-only account, or no such user.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    await write_system_log("INFO", f"Login: {email}", source="auth", user_id=str(user["_id"]))
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest) -> TokenResponse:
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    db = get_db()
    from bson import ObjectId

    user = await db.users.find_one({"_id": ObjectId(decoded["sub"])})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    return TokenResponse(
        access_token=create_access_token(str(user["_id"]), user.get("role", Role.USER.value))
    )


# --- Google OAuth ----------------------------------------------------------
@router.get("/google/login")
async def google_login() -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google sign-in is not configured on this server",
        )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": _GOOGLE_SCOPE,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str | None = None, error: str | None = None) -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google sign-in is not configured on this server",
        )
    if error or not code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Google authorization failed: {error or 'missing code'}")

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to exchange Google authorization code")
        access = token_resp.json().get("access_token")

        info_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access}"},
        )
        if info_resp.status_code != 200:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to fetch Google profile")
        info = info_resp.json()

    google_id = info.get("id")
    email = (info.get("email") or "").lower()
    if not google_id or not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Google profile did not return an email")

    db = get_db()
    now = utcnow()
    user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]})

    if user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "google_id": google_id,
                    "is_verified": True,
                    "avatar_url": user.get("avatar_url") or info.get("picture"),
                    "updated_at": now,
                }
            },
        )
        user = await db.users.find_one({"_id": user["_id"]})
    else:
        doc = {
            "email": email,
            "hashed_password": None,
            "full_name": info.get("name") or email.split("@")[0],
            "role": Role.USER.value,
            "is_active": True,
            "is_verified": True,
            "google_id": google_id,
            "avatar_url": info.get("picture"),
            "target_exams": [],
            "created_at": now,
            "updated_at": now,
        }
        result = await db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        user = doc
        await write_system_log("INFO", f"Google signup: {email}", source="auth", user_id=str(result.inserted_id))

    tokens = _issue_tokens(user)
    params = urlencode({"access_token": tokens.access_token, "refresh_token": tokens.refresh_token})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?{params}")


# --- Email verification ----------------------------------------------------
@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest) -> dict:
    decoded = decode_token(payload.token)
    if not decoded or decoded.get("type") != "verify":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification token")

    from bson import ObjectId

    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(decoded["sub"])},
        {"$set": {"is_verified": True, "updated_at": utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"message": "Email verified successfully"}


# --- Password reset --------------------------------------------------------
@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot", 6, 3600))])
async def forgot_password(payload: ForgotPasswordRequest) -> dict:
    db = get_db()
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = create_purpose_token(str(user["_id"]), "reset", hours=2)
        await send_reset_email(email, token)
    # Always return 200 to avoid leaking which emails are registered.
    return {"message": "If an account exists for that email, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest) -> dict:
    decoded = decode_token(payload.token)
    if not decoded or decoded.get("type") != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")

    from bson import ObjectId

    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(decoded["sub"])},
        {"$set": {"hashed_password": hash_password(payload.new_password), "updated_at": utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"message": "Password reset successfully"}

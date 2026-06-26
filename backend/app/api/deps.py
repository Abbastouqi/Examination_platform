"""FastAPI dependencies: current-user resolution, RBAC, API-key auth."""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.security import decode_token, hash_api_key
from app.db.mongo import get_db
from app.models.common import Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False)


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user_id = payload.get("sub")
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


async def get_current_active_user(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_verified", False) and settings.is_production:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != Role.ADMIN.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin privileges required")
    return user


async def get_api_key_owner(x_api_key: str | None = Header(default=None)) -> dict:
    """Authenticate an external API consumer via the `X-API-Key` header.

    Validates the key, checks expiry/active state, and meters one call.
    Returns the owning user document.
    """
    if not x_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-API-Key header")
    db = get_db()
    key_doc = await db.api_keys.find_one({"key_hash": hash_api_key(x_api_key)})
    if not key_doc or not key_doc.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    if key_doc.get("expires_at") and key_doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API key expired")

    await db.api_keys.update_one(
        {"_id": key_doc["_id"]},
        {"$inc": {"usage_count": 1}, "$set": {"last_used_at": datetime.now(timezone.utc)}},
    )
    user = await db.users.find_one({"_id": ObjectId(key_doc["user_id"])})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Key owner inactive")
    user["_api_key_id"] = str(key_doc["_id"])
    return user

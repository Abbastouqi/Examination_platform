"""Current-user (self-service) endpoints: profile, password, usage.

Mounted by main.py at `{API_V1_PREFIX}/users`, so routes here are declared
without that prefix. All routes require an authenticated, active user.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_user
from app.core.security import hash_password, verify_password
from app.db.mongo import get_db
from app.models.common import utcnow
from app.schemas.auth import ChangePasswordRequest, UpdateProfileRequest
from app.services.quota import usage_summary
from app.utils.serialize import serialize

router = APIRouter()


def _public_user(user: dict) -> dict:
    safe = serialize(user)
    safe.pop("hashed_password", None)
    return safe


@router.get("/me")
async def read_me(user: dict = Depends(get_current_active_user)) -> dict:
    return _public_user(user)


@router.patch("/me")
async def update_me(
    payload: UpdateProfileRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return _public_user(user)

    updates["updated_at"] = utcnow()
    db = get_db()
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return _public_user(fresh)


@router.post("/me/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    if not user.get("hashed_password"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This account uses Google sign-in and has no password to change",
        )
    if not verify_password(payload.old_password, user["hashed_password"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    db = get_db()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hash_password(payload.new_password), "updated_at": utcnow()}},
    )
    return {"message": "Password changed successfully"}


@router.get("/me/usage")
async def my_usage(user: dict = Depends(get_current_active_user)) -> dict:
    return await usage_summary(str(user["_id"]))

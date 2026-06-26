"""User-facing API key management.

Users create keys to access the public integrator API. The plaintext key is
shown exactly once, at creation time; only its SHA-256 hash is stored. All
endpoints operate strictly on the calling user's own keys.
"""
from datetime import timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_user
from app.core.security import generate_api_key
from app.db.mongo import get_db
from app.models.common import utcnow
from app.schemas.content import ApiKeyCreateRequest
from app.utils.serialize import serialize

router = APIRouter()


def _public_key_view(doc: dict) -> dict:
    """Serialize a key doc for output, never exposing the hash."""
    out = serialize(doc)
    out.pop("key_hash", None)
    prefix = doc.get("key_prefix") or ""
    out["masked_key"] = f"{prefix}{'*' * 8}" if prefix else "*" * 8
    return out


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    db = get_db()
    plaintext, key_hash = generate_api_key()
    now = utcnow()
    expires_at = (
        now + timedelta(days=payload.expires_days) if payload.expires_days else None
    )
    doc = {
        "user_id": str(user["_id"]),
        "name": payload.name.strip(),
        "key_hash": key_hash,
        "key_prefix": plaintext[:12],
        "scopes": payload.scopes,
        "is_active": True,
        "usage_count": 0,
        "last_used_at": None,
        "expires_at": expires_at,
        "created_at": now,
    }
    res = await db.api_keys.insert_one(doc)
    doc["_id"] = res.inserted_id

    view = _public_key_view(doc)
    view["key"] = plaintext
    view["warning"] = (
        "Store this key securely. It will not be shown again."
    )
    return view


@router.get("/")
async def list_api_keys(user: dict = Depends(get_current_active_user)) -> list[dict]:
    db = get_db()
    cursor = db.api_keys.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [_public_key_view(doc) async for doc in cursor]


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: dict = Depends(get_current_active_user),
) -> dict:
    db = get_db()
    try:
        _id = ObjectId(key_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid key id")
    key_doc = await db.api_keys.find_one({"_id": _id})
    if not key_doc or key_doc.get("user_id") != str(user["_id"]):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")
    await db.api_keys.update_one(
        {"_id": _id}, {"$set": {"is_active": False, "updated_at": utcnow()}}
    )
    return {"revoked": True, "key_id": key_id}


@router.get("/{key_id}/usage")
async def api_key_usage(
    key_id: str,
    user: dict = Depends(get_current_active_user),
) -> dict:
    db = get_db()
    try:
        _id = ObjectId(key_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid key id")
    key_doc = await db.api_keys.find_one({"_id": _id})
    if not key_doc or key_doc.get("user_id") != str(user["_id"]):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")
    return {
        "key_id": key_id,
        "name": key_doc.get("name"),
        "usage_count": key_doc.get("usage_count", 0),
        "last_used_at": key_doc.get("last_used_at"),
        "is_active": key_doc.get("is_active", True),
        "expires_at": key_doc.get("expires_at"),
    }

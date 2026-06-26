"""Admin dashboard APIs.

Every endpoint in this router requires an authenticated admin (enforced at the
router level via ``Depends(require_admin)``). Covers user management, content
taxonomy (subjects/topics), syllabus + system-log inspection, platform
analytics, and oversight of all issued API keys.
"""
from datetime import timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from slugify import slugify

from app.api.deps import require_admin
from app.core.logging import write_system_log
from app.db.mongo import get_db
from app.models.common import Role, utcnow
from app.schemas.admin import SubjectIn, TopicIn, UpdateUserRequest
from app.services.subscription_service import revenue_stats
from app.utils.serialize import oid, serialize

router = APIRouter(dependencies=[Depends(require_admin)])


def _strip_secret(user: dict) -> dict:
    """Serialize a user doc, dropping any password material."""
    doc = serialize(user)
    doc.pop("hashed_password", None)
    doc.pop("password", None)
    return doc


# --- Users -----------------------------------------------------------------
@router.get("/users")
async def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
) -> dict:
    db = get_db()
    query: dict = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
        ]
    total = await db.users.count_documents(query)
    cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = [_strip_secret(doc) async for doc in cursor]
    return {"total": total, "skip": skip, "limit": limit, "items": items}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    admin: dict = Depends(require_admin),
) -> dict:
    db = get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user id")

    target = await db.users.find_one({"_id": _id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    updates: dict = {}
    if payload.role is not None:
        updates["role"] = payload.role.value
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active
    if payload.is_verified is not None:
        updates["is_verified"] = payload.is_verified

    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    # Guard: never demote/deactivate the last remaining admin.
    demoting = (payload.role is not None and payload.role != Role.ADMIN) or (
        payload.is_active is False
    )
    if target.get("role") == Role.ADMIN.value and demoting:
        active_admins = await db.users.count_documents(
            {"role": Role.ADMIN.value, "is_active": True}
        )
        if active_admins <= 1:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Cannot demote or deactivate the last active admin",
            )

    updates["updated_at"] = utcnow()
    await db.users.update_one({"_id": _id}, {"$set": updates})
    await write_system_log(
        "info",
        f"Admin updated user {user_id}",
        source="admin",
        user_id=str(admin["_id"]),
        meta={"target": user_id, "updates": {k: str(v) for k, v in updates.items()}},
    )
    updated = await db.users.find_one({"_id": _id})
    return _strip_secret(updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)) -> dict:
    """Soft-delete a user (is_active=False). Cannot delete self or last admin."""
    db = get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user id")

    if str(admin["_id"]) == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")

    target = await db.users.find_one({"_id": _id})
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if target.get("role") == Role.ADMIN.value:
        active_admins = await db.users.count_documents(
            {"role": Role.ADMIN.value, "is_active": True}
        )
        if active_admins <= 1:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Cannot delete the last active admin"
            )

    await db.users.update_one(
        {"_id": _id}, {"$set": {"is_active": False, "updated_at": utcnow()}}
    )
    await write_system_log(
        "warning",
        f"Admin soft-deleted user {user_id}",
        source="admin",
        user_id=str(admin["_id"]),
        meta={"target": user_id},
    )
    return {"deleted": True, "user_id": user_id}


# --- Subjects --------------------------------------------------------------
@router.get("/subjects")
async def list_subjects() -> list[dict]:
    db = get_db()
    cursor = db.subjects.find({}).sort("name", 1)
    return [serialize(doc) async for doc in cursor]


@router.post("/subjects", status_code=status.HTTP_201_CREATED)
async def create_subject(payload: SubjectIn) -> dict:
    db = get_db()
    slug = slugify(payload.name)
    if await db.subjects.find_one({"slug": slug}):
        raise HTTPException(status.HTTP_409_CONFLICT, "A subject with this name already exists")
    doc = {
        "name": payload.name.strip(),
        "slug": slug,
        "test_types": payload.test_types,
        "description": payload.description,
        "created_at": utcnow(),
    }
    res = await db.subjects.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.patch("/subjects/{subject_id}")
async def update_subject(subject_id: str, payload: SubjectIn) -> dict:
    db = get_db()
    try:
        _id = ObjectId(subject_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid subject id")
    if not await db.subjects.find_one({"_id": _id}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")

    slug = slugify(payload.name)
    clash = await db.subjects.find_one({"slug": slug, "_id": {"$ne": _id}})
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "A subject with this name already exists")

    updates = {
        "name": payload.name.strip(),
        "slug": slug,
        "test_types": payload.test_types,
        "description": payload.description,
        "updated_at": utcnow(),
    }
    await db.subjects.update_one({"_id": _id}, {"$set": updates})
    return serialize(await db.subjects.find_one({"_id": _id}))


@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str) -> dict:
    db = get_db()
    try:
        _id = ObjectId(subject_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid subject id")
    res = await db.subjects.delete_one({"_id": _id})
    if not res.deleted_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    # Cascade: remove the subject's topics.
    await db.topics.delete_many({"subject_id": _id})
    return {"deleted": True, "subject_id": subject_id}


# --- Topics ----------------------------------------------------------------
@router.get("/topics")
async def list_topics(subject_id: str | None = Query(default=None)) -> list[dict]:
    db = get_db()
    query: dict = {}
    if subject_id:
        try:
            query["subject_id"] = ObjectId(subject_id)
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid subject id")
    cursor = db.topics.find(query).sort("name", 1)
    return [serialize(doc) async for doc in cursor]


@router.post("/topics", status_code=status.HTTP_201_CREATED)
async def create_topic(payload: TopicIn) -> dict:
    db = get_db()
    try:
        subject_oid = ObjectId(payload.subject_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid subject id")
    if not await db.subjects.find_one({"_id": subject_oid}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    doc = {
        "subject_id": subject_oid,
        "name": payload.name.strip(),
        "slug": slugify(payload.name),
        "created_at": utcnow(),
    }
    res = await db.topics.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str) -> dict:
    db = get_db()
    try:
        _id = ObjectId(topic_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid topic id")
    res = await db.topics.delete_one({"_id": _id})
    if not res.deleted_count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")
    return {"deleted": True, "topic_id": topic_id}


# --- Syllabus --------------------------------------------------------------
@router.get("/syllabus")
async def list_syllabus(
    test_type: str | None = Query(default=None),
    subject_id: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict]:
    db = get_db()
    query: dict = {}
    if test_type:
        query["test_type"] = test_type
    if subject_id:
        try:
            query["subject_id"] = ObjectId(subject_id)
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid subject id")
    cursor = db.syllabus.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return [serialize(doc) async for doc in cursor]


# --- System logs -----------------------------------------------------------
@router.get("/logs")
async def list_logs(
    level: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    db = get_db()
    query: dict = {}
    if level:
        query["level"] = level.upper()
    total = await db.system_logs.count_documents(query)
    cursor = db.system_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = [serialize(doc) async for doc in cursor]
    return {"total": total, "skip": skip, "limit": limit, "items": items}


# --- Analytics -------------------------------------------------------------
@router.get("/analytics/overview")
async def analytics_overview() -> dict:
    db = get_db()
    now = utcnow()
    last_7 = now - timedelta(days=7)
    last_30 = now - timedelta(days=30)

    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": last_7}})
    new_users_30d = await db.users.count_documents({"created_at": {"$gte": last_30}})

    total_mcqs = await db.mcqs.count_documents({})
    total_tests = await db.tests.count_documents({})
    total_attempts = await db.attempts.count_documents({})
    total_chats = await db.chats.count_documents({})

    # Daily signups over the last 30 days (YYYY-MM-DD), oldest first.
    trend_cursor = db.users.aggregate(
        [
            {"$match": {"created_at": {"$gte": last_30}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    )
    signups_trend = [
        {"date": d["_id"], "count": d["count"]} async for d in trend_cursor
    ]

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_last_7_days": new_users_7d,
            "new_last_30_days": new_users_30d,
        },
        "content": {
            "total_mcqs": total_mcqs,
            "total_tests": total_tests,
            "total_attempts": total_attempts,
            "total_chats": total_chats,
        },
        "signups_trend": signups_trend,
    }


@router.get("/analytics/revenue")
async def analytics_revenue() -> dict:
    return await revenue_stats()


# --- API key oversight -----------------------------------------------------
@router.get("/api-keys")
async def list_all_api_keys(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    db = get_db()
    total = await db.api_keys.count_documents({})
    cursor = db.api_keys.find({}).sort("created_at", -1).skip(skip).limit(limit)

    items: list[dict] = []
    owner_cache: dict[str, str | None] = {}
    async for doc in cursor:
        out = serialize(doc)
        out.pop("key_hash", None)
        user_id = doc.get("user_id")
        if user_id not in owner_cache:
            try:
                owner = await db.users.find_one({"_id": oid(user_id)}) if user_id else None
            except Exception:
                owner = None
            owner_cache[user_id] = owner.get("email") if owner else None
        out["owner_email"] = owner_cache.get(user_id)
        items.append(out)

    return {"total": total, "skip": skip, "limit": limit, "items": items}


# --- Manual payment review -------------------------------------------------
@router.get("/payments")
async def list_payments(
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    """List submitted manual payments (optionally filter by status)."""
    from app.services import manual_payment_service

    return await manual_payment_service.list_payments(status_filter)


@router.post("/payments/{payment_id}/approve")
async def approve_payment(payment_id: str) -> dict:
    """Approve a payment and activate the buyer's subscription."""
    from app.services import manual_payment_service

    return await manual_payment_service.approve_payment(payment_id)


@router.post("/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, reason: str = Query(default="")) -> dict:
    from app.services import manual_payment_service

    return await manual_payment_service.reject_payment(payment_id, reason)

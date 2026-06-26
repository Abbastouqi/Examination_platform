"""Usage quotas: enforce free-plan daily limits; unlimited for paid plans.

Daily counters live in the `usage` collection keyed by (user_id, date). The
active plan is read from the user's subscription. Paid plans bypass limits.
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.config import settings
from app.db.mongo import get_db
from app.models.common import PlanType, Role, SubscriptionStatus

# feature -> (usage field, free daily limit)
_LIMITS = {
    "mcq": ("mcq_count", settings.FREE_DAILY_MCQS),
    "chat": ("chat_count", settings.FREE_DAILY_CHAT),
    "mocktest": ("mocktest_count", settings.FREE_DAILY_MOCKTESTS),
}


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_active_plan(user_id: str) -> str:
    db = get_db()
    sub = await db.subscriptions.find_one(
        {"user_id": user_id, "status": SubscriptionStatus.ACTIVE.value}
    )
    if not sub:
        return PlanType.FREE.value
    if sub.get("expires_at") and sub["expires_at"] < datetime.now(timezone.utc):
        await db.subscriptions.update_one(
            {"_id": sub["_id"]}, {"$set": {"status": SubscriptionStatus.EXPIRED.value}}
        )
        return PlanType.FREE.value
    return sub.get("plan", PlanType.FREE.value)


async def check_and_consume(user_id: str, feature: str, amount: int = 1) -> None:
    """Raise 402 if the free-plan daily limit is exceeded; otherwise record usage."""
    if feature not in _LIMITS:
        return
    db = get_db()
    owner = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if owner and owner.get("role") == Role.ADMIN.value:
        return  # admins are unlimited
    plan = await get_active_plan(user_id)
    if plan != PlanType.FREE.value:
        return  # paid plans are unlimited

    field, limit = _LIMITS[feature]
    db = get_db()
    doc = await db.usage.find_one({"user_id": user_id, "date": _today()})
    used = (doc or {}).get(field, 0)
    if used + amount > limit:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Daily free limit reached for '{feature}' ({limit}/day). Upgrade for unlimited access.",
        )
    await db.usage.update_one(
        {"user_id": user_id, "date": _today()},
        {"$inc": {field: amount}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


async def usage_summary(user_id: str) -> dict:
    db = get_db()
    doc = await db.usage.find_one({"user_id": user_id, "date": _today()}) or {}
    plan = await get_active_plan(user_id)
    out = {"plan": plan, "date": _today(), "features": {}}
    for feature, (field, limit) in _LIMITS.items():
        used = doc.get(field, 0)
        out["features"][feature] = {
            "used": used,
            "limit": None if plan != PlanType.FREE.value else limit,
            "unlimited": plan != PlanType.FREE.value,
        }
    return out

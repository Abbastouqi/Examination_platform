"""Subscription plans, activation lifecycle, and revenue analytics.

A subscription links a user to a plan for a fixed window. Activating a new
subscription expires any currently-active one. Revenue stats aggregate over
successful payments and active subscriptions for the admin dashboard.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from app.db.mongo import get_db
from app.models.common import PaymentStatus, SubscriptionStatus, utcnow
from app.utils.serialize import oid, serialize

# --- Plan catalog ----------------------------------------------------------
# Prices in PKR. duration_days == 0 means the plan never expires (free tier).
PLANS: dict[str, dict] = {
    "free": {
        "name": "Free",
        "price": 0,
        "duration_days": 0,
        "features": [
            "20 MCQs per day",
            "1 mock test per day",
            "Limited AI tutor chat",
        ],
    },
    "pro": {
        "name": "Pro",
        "price": 999,
        "duration_days": 30,
        "features": [
            "Unlimited MCQs",
            "Unlimited mock tests",
            "Detailed explanations",
        ],
    },
    "premium": {
        "name": "Premium",
        "price": 2499,
        "duration_days": 30,
        "features": [
            "Everything in Pro",
            "AI Tutor",
            "Performance analytics",
            "Priority generation",
        ],
    },
}


def list_plans() -> list[dict]:
    """Return the plan catalog as a list, each item including its ``id``."""
    return [{"id": plan_id, **details} for plan_id, details in PLANS.items()]


async def get_active_subscription(user_id: str) -> dict | None:
    """Return the user's current active (non-expired) subscription, if any."""
    db = get_db()
    sub = await db.subscriptions.find_one(
        {
            "user_id": str(user_id),
            "status": SubscriptionStatus.ACTIVE.value,
        }
    )
    # Lazily expire a subscription whose window has elapsed.
    if sub and sub.get("expires_at") and sub["expires_at"] < utcnow():
        await db.subscriptions.update_one(
            {"_id": sub["_id"]},
            {"$set": {"status": SubscriptionStatus.EXPIRED.value, "updated_at": utcnow()}},
        )
        return None
    return serialize(sub) if sub else None


async def activate_subscription(
    user_id: str,
    plan: str,
    provider: str,
    payment_id: str,
) -> dict:
    """Activate ``plan`` for ``user_id``, expiring any current active sub.

    Returns the serialized new subscription document.
    """
    db = get_db()
    now = utcnow()

    # Expire any currently-active subscription for this user.
    await db.subscriptions.update_many(
        {"user_id": str(user_id), "status": SubscriptionStatus.ACTIVE.value},
        {"$set": {"status": SubscriptionStatus.EXPIRED.value, "updated_at": now}},
    )

    duration = PLANS.get(plan, {}).get("duration_days", 0)
    expires_at = now + timedelta(days=duration) if duration > 0 else None

    doc = {
        "user_id": str(user_id),
        "plan": plan,
        "status": SubscriptionStatus.ACTIVE.value,
        "provider": provider,
        "started_at": now,
        "expires_at": expires_at,
        "payment_id": str(payment_id) if payment_id else None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.subscriptions.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Reflect the active plan on the user record for quick lookups elsewhere.
    await db.users.update_one(
        {"_id": oid(user_id)},
        {"$set": {"plan": plan, "updated_at": now}},
    )
    return serialize(doc)


async def cancel_subscription(user_id: str) -> dict:
    """Cancel the user's active subscription. Idempotent.

    The subscription stays usable until ``expires_at`` is reached elsewhere;
    here we simply mark it cancelled so it does not auto-renew.
    """
    db = get_db()
    now = utcnow()
    res = await db.subscriptions.update_one(
        {"user_id": str(user_id), "status": SubscriptionStatus.ACTIVE.value},
        {"$set": {"status": SubscriptionStatus.CANCELLED.value, "updated_at": now}},
    )
    if res.modified_count:
        await db.users.update_one(
            {"_id": oid(user_id)},
            {"$set": {"plan": "free", "updated_at": now}},
        )
    return {"cancelled": bool(res.modified_count)}


async def revenue_stats() -> dict[str, Any]:
    """Aggregate revenue and subscriber metrics for the admin dashboard."""
    db = get_db()
    # Gateway payments settle as "success"; manual (approved-by-admin) ones as
    # "approved". Both count as realised revenue.
    paid = {"$in": [PaymentStatus.SUCCESS.value, "approved"]}

    # Total revenue over all paid payments.
    total_cursor = db.payments.aggregate(
        [
            {"$match": {"status": paid}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        ]
    )
    total_docs = await total_cursor.to_list(length=1)
    total_revenue = total_docs[0]["total"] if total_docs else 0
    total_payments = total_docs[0]["count"] if total_docs else 0

    # Revenue grouped by plan.
    by_plan_cursor = db.payments.aggregate(
        [
            {"$match": {"status": paid}},
            {"$group": {"_id": "$plan", "revenue": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        ]
    )
    revenue_by_plan = {
        (d["_id"] or "unknown"): {"revenue": d["revenue"], "count": d["count"]}
        async for d in by_plan_cursor
    }

    # Revenue grouped by calendar month (YYYY-MM).
    by_month_cursor = db.payments.aggregate(
        [
            {"$match": {"status": paid}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
                    "revenue": {"$sum": "$amount"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    )
    revenue_by_month = [
        {"month": d["_id"], "revenue": d["revenue"], "count": d["count"]}
        async for d in by_month_cursor
    ]

    # Active subscriber counts grouped by plan.
    subs_cursor = db.subscriptions.aggregate(
        [
            {"$match": {"status": SubscriptionStatus.ACTIVE.value}},
            {"$group": {"_id": "$plan", "count": {"$sum": 1}}},
        ]
    )
    active_by_plan = {(d["_id"] or "unknown"): d["count"] async for d in subs_cursor}

    # MRR estimate: sum of monthly-normalised plan price * active subscribers.
    mrr = 0.0
    for plan_id, count in active_by_plan.items():
        plan = PLANS.get(plan_id)
        if not plan or plan["duration_days"] <= 0:
            continue
        monthly_price = plan["price"] * (30.0 / plan["duration_days"])
        mrr += monthly_price * count

    return {
        "total_revenue": total_revenue,
        "total_payments": total_payments,
        "currency": "PKR",
        "revenue_by_plan": revenue_by_plan,
        "revenue_by_month": revenue_by_month,
        "active_subscribers_by_plan": active_by_plan,
        "active_subscribers_total": sum(active_by_plan.values()),
        "mrr_estimate": round(mrr, 2),
    }

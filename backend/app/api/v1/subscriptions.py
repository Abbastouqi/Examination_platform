"""Subscription endpoints: plan catalog, current subscription, cancel."""
from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.services import subscription_service

router = APIRouter()


@router.get("/plans")
async def get_plans() -> list[dict]:
    """Public plan catalog (no auth required)."""
    return subscription_service.list_plans()


@router.get("/me")
async def my_subscription(user: dict = Depends(get_current_active_user)) -> dict:
    """The current user's active subscription plus its plan details.

    Falls back to the free plan when the user has no active subscription.
    """
    sub = await subscription_service.get_active_subscription(str(user["_id"]))
    plan_id = sub["plan"] if sub else "free"
    plan = subscription_service.PLANS.get(plan_id, subscription_service.PLANS["free"])
    return {
        "subscription": sub,
        "plan": {"id": plan_id, **plan},
    }


@router.post("/cancel")
async def cancel(user: dict = Depends(get_current_active_user)) -> dict:
    """Cancel the current user's active subscription."""
    return await subscription_service.cancel_subscription(str(user["_id"]))

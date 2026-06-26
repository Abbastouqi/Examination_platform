"""Request/response schemas for subscriptions and payments."""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PaymentProvider, PlanType


class SubscribeRequest(BaseModel):
    plan: PlanType
    provider: PaymentProvider


class PlanOut(BaseModel):
    id: str
    name: str
    price: int
    duration_days: int
    features: list[str] = Field(default_factory=list)


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    user_id: str | None = None
    plan: str
    status: str
    provider: str | None = None
    started_at: Any | None = None
    expires_at: Any | None = None
    payment_id: str | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    user_id: str | None = None
    plan: str | None = None
    amount: float | None = None
    currency: str = "PKR"
    provider: str | None = None
    provider_ref: str | None = None
    status: str
    created_at: Any | None = None

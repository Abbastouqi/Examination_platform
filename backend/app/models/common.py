"""Shared enums, the PyObjectId type, and a base document model."""
from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MongoModel(BaseModel):
    """Base for response models that map a Mongo `_id` -> `id`."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: PyObjectId | None = Field(default=None, alias="_id")


# --- Domain enums ----------------------------------------------------------
class Role(str, Enum):
    USER = "user"
    ADMIN = "admin"


class TestType(str, Enum):
    FPSC = "FPSC"
    NTS = "NTS"
    PPSC = "PPSC"
    FGEI_EST = "FGEI_EST"
    LECTURER = "LECTURER"
    PMS = "PMS"
    CSS = "CSS"
    OTHER = "OTHER"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    MIXED = "mixed"


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentProvider(str, Enum):
    JAZZCASH = "jazzcash"
    EASYPAISA = "easypaisa"
    MANUAL = "manual"


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


class TestMode(str, Enum):
    FULL = "full"          # full-length, multi-subject
    SUBJECT = "subject"    # single subject
    TOPIC = "topic"        # single topic


class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    EXPIRED = "expired"

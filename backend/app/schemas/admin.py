"""Request/response schemas for the admin dashboard subsystem."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import Role


class UpdateUserRequest(BaseModel):
    """Partial update for a user record. Omitted fields are left unchanged."""

    role: Role | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class SubjectIn(BaseModel):
    name: str = Field(min_length=1)
    test_types: list[str] = Field(default_factory=list)
    description: str = ""


class TopicIn(BaseModel):
    subject_id: str
    name: str = Field(min_length=1)


class SystemLogOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    level: str
    message: str
    source: str | None = None
    user_id: str | None = None
    meta: dict | None = None
    created_at: datetime | None = None


class UserAdminOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    email: str
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    is_verified: bool | None = None
    created_at: datetime | None = None

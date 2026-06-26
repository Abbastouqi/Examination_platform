"""Request/response schemas for API keys and the public integrator API."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- API keys --------------------------------------------------------------
class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    scopes: list[str] = Field(default_factory=lambda: ["mcq", "chat"])
    expires_days: int | None = Field(default=None, ge=1)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    name: str | None = None
    key_prefix: str | None = None
    masked_key: str | None = None
    scopes: list[str] = Field(default_factory=list)
    is_active: bool | None = None
    usage_count: int | None = None
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None


# --- Public integrator API -------------------------------------------------
class PublicMCQRequest(BaseModel):
    test_type: str
    subject: str
    topic: str | None = None
    difficulty: str = "mixed"
    count: int = Field(default=10, le=50, ge=1)


class PublicAskRequest(BaseModel):
    question: str = Field(min_length=1)


class PublicExplainRequest(BaseModel):
    question: str
    options: dict[str, str]
    correct: str

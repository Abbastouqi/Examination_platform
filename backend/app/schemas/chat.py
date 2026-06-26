"""Request/response schemas for the chat assistant subsystem."""
from pydantic import BaseModel, ConfigDict, Field

from app.models.common import TestType


class CreateChatRequest(BaseModel):
    title: str | None = None


class SendMessageRequest(BaseModel):
    chat_id: str | None = None
    message: str = Field(min_length=1)
    use_rag: bool = True
    stream: bool = True


class RenameChatRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ChatOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    title: str
    messages: list[dict] | None = None
    created_at: object | None = None
    updated_at: object | None = None


class StudyPlanRequest(BaseModel):
    test_type: TestType
    subject: str = Field(min_length=1)
    days: int = Field(ge=1, le=180)
    hours_per_day: int = Field(ge=1, le=16)

"""Request/response schemas for the mock-test subsystem."""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import Difficulty, TestMode, TestType


class SectionSpec(BaseModel):
    subject_id: str | None = None
    name: str
    count: int = Field(ge=1, le=200)


class CreateTestRequest(BaseModel):
    title: str
    test_type: TestType
    mode: TestMode
    subject_ids: list[str] = Field(default_factory=list)
    topic_ids: list[str] = Field(default_factory=list)
    difficulty: Difficulty = Difficulty.MIXED
    num_questions: int = Field(ge=1, le=200)
    duration_minutes: int = Field(default=60, ge=1, le=600)
    section_spec: list[SectionSpec] | None = None


class SubmitAttemptRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class TestOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    user_id: str | None = None
    title: str
    test_type: str
    mode: str
    difficulty: str | None = None
    num_questions: int
    duration_minutes: int
    sections: list[dict[str, Any]] = Field(default_factory=list)


class AttemptOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    user_id: str | None = None
    test_id: str | None = None
    status: str
    total: int | None = None


class ResultOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    attempt_id: str
    test_id: str
    status: str
    score: float | None = None
    total: int | None = None
    correct: int | None = None
    wrong: int | None = None
    skipped: int | None = None
    time_taken_seconds: int | None = None
    per_topic: dict[str, Any] = Field(default_factory=dict)

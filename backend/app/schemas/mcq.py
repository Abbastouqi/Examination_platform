"""Request/response schemas for the MCQ subsystem."""
from pydantic import BaseModel, ConfigDict, Field

from app.models.common import Difficulty, TestType


class GenerateMCQRequest(BaseModel):
    test_type: TestType
    subject_id: str | None = None
    subject_name: str = ""
    topic_id: str | None = None
    topic_name: str | None = None
    difficulty: Difficulty = Difficulty.MIXED
    count: int = Field(default=10, ge=1, le=50)


class ExplanationRequest(BaseModel):
    question: str
    options: dict[str, str]
    correct: str


class MCQOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    question: str
    options: dict[str, str]
    answer: str | None = None
    explanation: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    test_type: str | None = None
    source: str | None = None

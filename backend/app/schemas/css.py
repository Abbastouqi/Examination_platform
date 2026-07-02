"""Request/response schemas for the CSS preparation module."""
from pydantic import BaseModel, Field


class EssayEvaluateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=400)
    essay: str = Field(min_length=50)


class PrecisEvaluateRequest(BaseModel):
    passage: str = Field(min_length=50)
    title: str = Field(default="", max_length=200)
    precis: str = Field(min_length=10)


class CSSAskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    stream: bool = False

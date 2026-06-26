"""Pydantic v2 request/response models for the auth & user subsystem."""
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth requests ---------------------------------------------------------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


# --- Auth responses --------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


# --- User profile ----------------------------------------------------------
class UserProfile(BaseModel):
    """Public-facing user fields (no secrets)."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="_id")
    email: EmailStr
    full_name: str | None = None
    role: str = "user"
    is_active: bool = True
    is_verified: bool = False
    avatar_url: str | None = None
    target_exams: list[str] = Field(default_factory=list)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    target_exams: list[str] | None = None
    avatar_url: str | None = None

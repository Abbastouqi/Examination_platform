"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=True)

    # General
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "PrepGenius"
    API_V1_PREFIX: str = "/api/v1"
    # Stored as a raw comma-separated string (plain str fields aren't JSON-decoded
    # by pydantic-settings); use the `cors_origins` property for the parsed list.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # Security
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    ALGORITHM: str = "HS256"

    # MongoDB
    MONGO_URI: str = "mongodb://mongo:27017"
    MONGO_DB: str = "prepgenius"

    # Qdrant
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "prepgenius_kb"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    # Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    EMBEDDING_DIM: int = 1024
    EMBEDDING_DEVICE: str = "cpu"

    # Qwen LLM
    QWEN_BASE_URL: str = "http://localhost:8001/v1"
    QWEN_API_KEY: str = "not-needed"
    QWEN_MODEL: str = "Qwen2.5-72B-Instruct"
    QWEN_TIMEOUT: int = 120
    QWEN_MAX_TOKENS: int = 2048
    QWEN_TEMPERATURE: float = 0.4

    # Optional fallback LLM endpoint (used automatically if the primary fails).
    QWEN_FALLBACK_BASE_URL: str = ""
    QWEN_FALLBACK_API_KEY: str = ""
    QWEN_FALLBACK_MODEL: str = ""

    # Circuit breaker: after N consecutive failures, short-circuit LLM calls for
    # `cooldown` seconds (return a fast 503) instead of hammering a down server.
    QWEN_CB_THRESHOLD: int = 4
    QWEN_CB_COOLDOWN: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "PrepGenius <no-reply@prepgenius.pk>"
    FRONTEND_URL: str = "http://localhost:3000"

    # Bootstrap admin
    ADMIN_EMAIL: str = "admin@prepgenius.pk"
    ADMIN_PASSWORD: str = "ChangeMe123!"

    # Payments — JazzCash
    JAZZCASH_MERCHANT_ID: str = ""
    JAZZCASH_PASSWORD: str = ""
    JAZZCASH_INTEGRITY_SALT: str = ""
    JAZZCASH_RETURN_URL: str = ""
    JAZZCASH_ENV: str = "sandbox"

    # Payments — Easypaisa
    EASYPAISA_STORE_ID: str = ""
    EASYPAISA_HASH_KEY: str = ""
    EASYPAISA_RETURN_URL: str = ""
    EASYPAISA_ENV: str = "sandbox"

    # Manual payment accounts (shown to users for wallet/bank transfer)
    PAYMENT_ACCOUNT_NAME: str = "PrepGenius"
    JAZZCASH_NUMBER: str = "+92 314 6002855"
    JAZZCASH_IBAN: str = "PK74JCMA0709923146002855"
    EASYPAISA_IBAN: str = "PK47TMFB0000000046882113"

    # Quotas
    FREE_DAILY_MCQS: int = 20
    FREE_DAILY_CHAT: int = 15
    FREE_DAILY_MOCKTESTS: int = 1

    # Uploads
    MAX_UPLOAD_MB: int = 50
    UPLOAD_DIR: str = "/data/uploads"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

"""Structured logging + a Mongo-backed system log sink for the admin panel."""
import sys
from datetime import datetime, timezone

from loguru import logger

from app.core.config import settings


def configure_logging() -> None:
    logger.remove()
    logger.add(
        sys.stdout,
        level="DEBUG" if not settings.is_production else "INFO",
        backtrace=not settings.is_production,
        diagnose=not settings.is_production,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    )


async def write_system_log(
    level: str,
    message: str,
    *,
    source: str = "app",
    user_id: str | None = None,
    meta: dict | None = None,
) -> None:
    """Persist an operational event to the `system_logs` collection.

    Imported lazily to avoid a circular import with the db module.
    """
    from app.db.mongo import get_db

    try:
        db = get_db()
        await db.system_logs.insert_one(
            {
                "level": level.upper(),
                "message": message,
                "source": source,
                "user_id": user_id,
                "meta": meta or {},
                "created_at": datetime.now(timezone.utc),
            }
        )
    except Exception as exc:  # logging must never break the request path
        logger.warning(f"Failed to persist system log: {exc}")

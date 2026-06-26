"""MongoDB connection lifecycle + index creation."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT

from app.core.config import settings
from app.core.logging import logger

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _db


async def connect_to_mongo() -> None:
    global _client, _db
    # tz_aware=True so datetimes read back from Mongo are timezone-aware (UTC),
    # matching utcnow(); otherwise aware/naive subtraction & comparisons crash.
    _client = AsyncIOMotorClient(settings.MONGO_URI, uuidRepresentation="standard", tz_aware=True)
    _db = _client[settings.MONGO_DB]
    await _client.admin.command("ping")
    logger.info(f"Connected to MongoDB: {settings.MONGO_DB}")
    await create_indexes()


async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("Closed MongoDB connection")


async def create_indexes() -> None:
    db = get_db()
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.users.create_index([("google_id", ASCENDING)], sparse=True)

    await db.subjects.create_index([("slug", ASCENDING)], unique=True)
    await db.topics.create_index([("subject_id", ASCENDING), ("slug", ASCENDING)])

    await db.mcqs.create_index([("subject_id", ASCENDING), ("topic_id", ASCENDING), ("difficulty", ASCENDING)])
    await db.mcqs.create_index([("test_type", ASCENDING)])
    await db.mcqs.create_index([("question", TEXT), ("explanation", TEXT)])

    await db.tests.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db.attempts.create_index([("user_id", ASCENDING), ("test_id", ASCENDING)])
    await db.attempts.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    await db.chats.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])

    await db.documents.create_index([("status", ASCENDING)])
    await db.syllabus.create_index([("test_type", ASCENDING), ("subject_id", ASCENDING)])

    await db.api_keys.create_index([("key_hash", ASCENDING)], unique=True)
    await db.api_keys.create_index([("user_id", ASCENDING)])

    await db.subscriptions.create_index([("user_id", ASCENDING)])
    await db.payments.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db.payments.create_index([("provider_ref", ASCENDING)], sparse=True)

    await db.usage.create_index([("user_id", ASCENDING), ("date", ASCENDING)], unique=True)
    await db.system_logs.create_index([("created_at", DESCENDING)])
    await db.system_logs.create_index([("level", ASCENDING)])

    logger.info("MongoDB indexes ensured")

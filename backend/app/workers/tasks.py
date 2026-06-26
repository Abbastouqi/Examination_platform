"""Celery task definitions.

Design note — Mongo connection in the worker:
The Celery worker process does NOT run the FastAPI lifespan, so the shared
`app.db.mongo` singleton is never initialised here. Each task also runs its
async body in a *fresh* event loop via ``asyncio.run(...)``. Motor clients are
bound to the loop that created them, so we deliberately create a brand-new
``AsyncIOMotorClient`` from ``settings.MONGO_URI`` inside each task invocation
(and close it in ``finally``) rather than reusing the API's connection. This is
the simplest robust approach for short-lived task processes.
"""
import asyncio

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging import logger
from app.models.common import DocumentStatus, utcnow
from app.services.ingestion import ingest_document
from app.workers.celery_app import celery


def _doc_filter(doc_id: str) -> dict:
    """Build a `_id` filter that tolerates both ObjectId and plain-string ids."""
    if isinstance(doc_id, str) and ObjectId.is_valid(doc_id):
        return {"_id": ObjectId(doc_id)}
    return {"_id": doc_id}


async def _run_ingestion(
    *,
    doc_id: str,
    file_path: str,
    source: str,
    kind: str,
    test_type: str | None,
    subject_id: str | None,
    topic_id: str | None,
) -> dict:
    """Async body: connect to Mongo, mark processing, ingest, mark indexed/failed."""
    client = AsyncIOMotorClient(settings.MONGO_URI, uuidRepresentation="standard")
    db = client[settings.MONGO_DB]
    flt = _doc_filter(doc_id)
    try:
        await db.documents.update_one(
            flt,
            {"$set": {"status": DocumentStatus.PROCESSING.value, "updated_at": utcnow()}},
        )
        chunk_count = await ingest_document(
            file_path=file_path,
            doc_id=doc_id,
            source=source,
            kind=kind,
            test_type=test_type,
            subject_id=subject_id,
            topic_id=topic_id,
        )
        await db.documents.update_one(
            flt,
            {
                "$set": {
                    "status": DocumentStatus.INDEXED.value,
                    "chunk_count": chunk_count,
                    "error": None,
                    "updated_at": utcnow(),
                }
            },
        )
        logger.info(f"Ingestion complete for doc {doc_id}: {chunk_count} chunks")
        return {"doc_id": doc_id, "status": DocumentStatus.INDEXED.value, "chunks": chunk_count}
    except Exception as exc:  # noqa: BLE001 — record any failure on the document
        logger.exception(f"Ingestion failed for doc {doc_id}: {exc}")
        await db.documents.update_one(
            flt,
            {
                "$set": {
                    "status": DocumentStatus.FAILED.value,
                    "error": str(exc),
                    "updated_at": utcnow(),
                }
            },
        )
        return {"doc_id": doc_id, "status": DocumentStatus.FAILED.value, "error": str(exc)}
    finally:
        client.close()


@celery.task(name="ingest_document", bind=True)
def ingest_document_task(
    self,
    *,
    doc_id: str,
    file_path: str,
    source: str,
    kind: str,
    test_type: str | None = None,
    subject_id: str | None = None,
    topic_id: str | None = None,
) -> dict:
    """Celery entrypoint: run the async ingestion pipeline for one document."""
    return asyncio.run(
        _run_ingestion(
            doc_id=doc_id,
            file_path=file_path,
            source=source,
            kind=kind,
            test_type=test_type,
            subject_id=subject_id,
            topic_id=topic_id,
        )
    )


@celery.task(name="refresh_current_affairs")
def refresh_current_affairs() -> dict:
    """Placeholder for a future current-affairs scraper (scheduled via beat)."""
    logger.info("refresh_current_affairs: not implemented")
    return {"status": "not_implemented"}

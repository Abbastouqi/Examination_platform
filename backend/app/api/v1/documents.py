"""Document / RAG ingestion routes.

Admins upload source material (syllabus, past papers, notes, current affairs).
Each upload is persisted to the ``documents`` collection and queued for
ingestion via the Celery worker; if the worker is unavailable (e.g. local dev)
ingestion runs inline so uploads still get indexed.
"""
import os
from pathlib import Path

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.logging import logger, write_system_log
from app.db.mongo import get_db
from app.models.common import DocumentStatus, Role, utcnow
from app.services import vectorstore
from app.utils.serialize import serialize

router = APIRouter()

_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
_ALLOWED_KINDS = {"syllabus", "past_paper", "notes", "current_affairs"}


def _require_admin_role(user: dict) -> None:
    if user.get("role") != Role.ADMIN.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin privileges required")


async def _ingest(doc_id: str, file_path: str, source: str, kind: str,
                  test_type: str | None, subject_id: str | None, topic_id: str | None) -> None:
    """Enqueue ingestion on the worker; fall back to inline ingestion in dev."""
    db = get_db()
    try:
        from app.workers.tasks import ingest_document_task

        ingest_document_task.delay(
            doc_id=doc_id,
            file_path=file_path,
            source=source,
            kind=kind,
            test_type=test_type,
            subject_id=subject_id,
            topic_id=topic_id,
        )
        await db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"status": DocumentStatus.PROCESSING.value, "updated_at": utcnow()}},
        )
    except Exception as exc:
        # Worker not running / not importable — ingest inline so dev still indexes.
        logger.warning(f"Celery enqueue failed, ingesting inline: {exc}")
        await db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"status": DocumentStatus.PROCESSING.value, "updated_at": utcnow()}},
        )
        try:
            from app.services.ingestion import ingest_document

            chunks = await ingest_document(
                file_path=file_path,
                doc_id=doc_id,
                source=source,
                kind=kind,
                test_type=test_type,
                subject_id=subject_id,
                topic_id=topic_id,
            )
            await db.documents.update_one(
                {"_id": ObjectId(doc_id)},
                {
                    "$set": {
                        "status": DocumentStatus.INDEXED.value,
                        "chunks": chunks,
                        "updated_at": utcnow(),
                    }
                },
            )
        except Exception as ingest_exc:
            logger.error(f"Inline ingestion failed for {doc_id}: {ingest_exc}")
            await db.documents.update_one(
                {"_id": ObjectId(doc_id)},
                {
                    "$set": {
                        "status": DocumentStatus.FAILED.value,
                        "error": str(ingest_exc),
                        "updated_at": utcnow(),
                    }
                },
            )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    kind: str = Form(...),
    source: str = Form(...),
    test_type: str | None = Form(default=None),
    subject_id: str | None = Form(default=None),
    topic_id: str | None = Form(default=None),
    user: dict = Depends(get_current_active_user),
) -> dict:
    _require_admin_role(user)

    if kind not in _ALLOWED_KINDS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid kind. Allowed: {', '.join(sorted(_ALLOWED_KINDS))}",
        )

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )

    # Read and enforce the size limit.
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the maximum allowed size of {settings.MAX_UPLOAD_MB} MB",
        )
    if not contents:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")

    db = get_db()
    now = utcnow()

    # Insert the record first so we have a stable id for the filename.
    doc = {
        "filename": filename,
        "source": source,
        "kind": kind,
        "test_type": test_type,
        "subject_id": subject_id,
        "topic_id": topic_id,
        "status": DocumentStatus.UPLOADED.value,
        "chunks": 0,
        "uploaded_by": str(user["_id"]),
        "created_at": now,
        "updated_at": now,
        "error": None,
    }
    res = await db.documents.insert_one(doc)
    doc_id = str(res.inserted_id)

    # Persist the file to disk under UPLOAD_DIR (created if missing).
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / f"{doc_id}{ext}"
    try:
        stored_path.write_bytes(contents)
    except Exception as exc:
        await db.documents.update_one(
            {"_id": res.inserted_id},
            {"$set": {"status": DocumentStatus.FAILED.value, "error": f"save failed: {exc}",
                      "updated_at": utcnow()}},
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to store uploaded file")

    await db.documents.update_one(
        {"_id": res.inserted_id}, {"$set": {"file_path": str(stored_path)}}
    )
    doc["_id"] = res.inserted_id
    doc["file_path"] = str(stored_path)

    await write_system_log(
        "info",
        f"Document uploaded: {filename}",
        source="documents",
        user_id=str(user["_id"]),
        meta={"doc_id": doc_id, "kind": kind, "source": source},
    )

    await _ingest(doc_id, str(stored_path), source, kind, test_type, subject_id, topic_id)

    # Return the latest record (status may have advanced during ingestion).
    return serialize(await db.documents.find_one({"_id": res.inserted_id}))


@router.get("/")
async def list_documents(
    status_filter: str | None = Query(default=None, alias="status"),
    kind: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_active_user),
) -> list[dict]:
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if kind:
        query["kind"] = kind
    cursor = db.documents.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return [serialize(doc) async for doc in cursor]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    user: dict = Depends(get_current_active_user),
) -> dict:
    db = get_db()
    try:
        _id = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid document id")
    doc = await db.documents.find_one({"_id": _id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return serialize(doc)


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: dict = Depends(get_current_active_user),
) -> dict:
    _require_admin_role(user)
    db = get_db()
    try:
        _id = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid document id")
    doc = await db.documents.find_one({"_id": _id})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    # Remove vectors for this doc from the store (best-effort).
    try:
        await vectorstore.delete_by_doc(doc_id)
    except Exception as exc:
        logger.warning(f"Failed to delete vectors for doc {doc_id}: {exc}")

    # Unlink the stored file if present.
    file_path = doc.get("file_path")
    if file_path:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as exc:
            logger.warning(f"Failed to remove file {file_path}: {exc}")

    await db.documents.delete_one({"_id": _id})
    await write_system_log(
        "warning",
        f"Document deleted: {doc.get('filename')}",
        source="documents",
        user_id=str(user["_id"]),
        meta={"doc_id": doc_id},
    )
    return {"deleted": True, "doc_id": doc_id}

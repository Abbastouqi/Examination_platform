"""Qdrant vector store wrapper for the knowledge base.

Payload schema per point:
    text, source, test_type, subject_id, topic_id, doc_id, chunk_index, kind
`kind` is "syllabus" | "past_paper" | "notes" | "current_affairs" | "mcq".
"""
import uuid

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.logging import logger

_client = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


async def ensure_collection() -> None:
    collections = await _client.get_collections()
    names = {c.name for c in collections.collections}
    if settings.QDRANT_COLLECTION not in names:
        await _client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=qm.VectorParams(size=settings.EMBEDDING_DIM, distance=qm.Distance.COSINE),
        )
        # Payload indexes for fast filtered retrieval
        for field in ("test_type", "subject_id", "topic_id", "doc_id", "kind"):
            await _client.create_payload_index(
                settings.QDRANT_COLLECTION, field_name=field, field_schema=qm.PayloadSchemaType.KEYWORD
            )
        logger.info(f"Created Qdrant collection {settings.QDRANT_COLLECTION}")


async def upsert(vectors: list[list[float]], payloads: list[dict]) -> list[str]:
    ids = [str(uuid.uuid4()) for _ in vectors]
    points = [
        qm.PointStruct(id=pid, vector=vec, payload=pl)
        for pid, vec, pl in zip(ids, vectors, payloads)
    ]
    await _client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
    return ids


def _build_filter(filters: dict | None) -> qm.Filter | None:
    if not filters:
        return None
    must = [
        qm.FieldCondition(key=k, match=qm.MatchValue(value=v))
        for k, v in filters.items()
        if v is not None
    ]
    return qm.Filter(must=must) if must else None


async def search(query_vector: list[float], *, limit: int = 6, filters: dict | None = None) -> list[dict]:
    results = await _client.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_vector,
        limit=limit,
        query_filter=_build_filter(filters),
        with_payload=True,
    )
    return [{"score": r.score, **(r.payload or {})} for r in results]


async def delete_by_doc(doc_id: str) -> None:
    await _client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=qm.FilterSelector(filter=_build_filter({"doc_id": doc_id})),
    )

"""Retrieval layer: turn a query + filters into grounded context text."""
from app.services import vectorstore
from app.services.embeddings import embed_query


async def retrieve_context(
    query: str,
    *,
    test_type: str | None = None,
    subject_id: str | None = None,
    topic_id: str | None = None,
    kind: str | None = None,
    limit: int = 6,
) -> tuple[str, list[dict]]:
    """Return (joined_context_text, raw_hits) for a query under optional filters."""
    qvec = embed_query(query)
    filters = {"test_type": test_type, "subject_id": subject_id, "topic_id": topic_id, "kind": kind}
    hits = await vectorstore.search(qvec, limit=limit, filters=filters)

    # Progressive fallback: relax filters if nothing matched the tight scope.
    if not hits and topic_id:
        hits = await vectorstore.search(qvec, limit=limit, filters={"test_type": test_type, "subject_id": subject_id})
    if not hits and subject_id:
        hits = await vectorstore.search(qvec, limit=limit, filters={"test_type": test_type})
    if not hits:
        hits = await vectorstore.search(qvec, limit=limit)

    blocks = []
    for i, h in enumerate(hits, 1):
        src = h.get("source", "unknown")
        blocks.append(f"[{i}] (source: {src})\n{h.get('text', '')}")
    return "\n\n".join(blocks), hits

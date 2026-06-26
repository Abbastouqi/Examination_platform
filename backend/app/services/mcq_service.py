"""MCQ generation, explanation, and listing service.

Generation is grounded with RAG context and produced by the Qwen model in
small batches for reliability. Generated MCQs may be persisted to `db.mcqs`.
"""
from typing import Any

from app.db.mongo import get_db
from app.models.common import utcnow
from app.services import prompts, qwen_client
from app.services.rag import retrieve_context
from app.utils.serialize import oid, serialize
from app.core.logging import logger, write_system_log

_VALID_ANSWERS = {"A", "B", "C", "D"}
_BATCH_SIZE = 15
_MAX_ATTEMPTS = 6


def _validate_mcq(item: Any) -> dict | None:
    """Return a normalised MCQ dict, or None if malformed."""
    if not isinstance(item, dict):
        return None
    question = item.get("question")
    options = item.get("options")
    answer = item.get("answer")
    explanation = item.get("explanation")
    if not isinstance(question, str) or not question.strip():
        return None
    if not isinstance(options, dict):
        return None
    if not all(k in options and isinstance(options[k], str) and options[k].strip() for k in ("A", "B", "C", "D")):
        return None
    if not isinstance(answer, str) or answer.strip().upper() not in _VALID_ANSWERS:
        return None
    if not isinstance(explanation, str) or not explanation.strip():
        return None
    return {
        "question": question.strip(),
        "options": {k: options[k].strip() for k in ("A", "B", "C", "D")},
        "answer": answer.strip().upper(),
        "explanation": explanation.strip(),
        "topic": (item.get("topic") or "").strip() if isinstance(item.get("topic"), str) else "",
        "difficulty": (item.get("difficulty") or "").strip() if isinstance(item.get("difficulty"), str) else "",
    }


async def generate_mcqs(
    *,
    test_type: str,
    subject_id: str | None = None,
    subject_name: str = "",
    topic_id: str | None = None,
    topic_name: str | None = None,
    difficulty: str,
    count: int,
    persist: bool = True,
    created_by: str | None = None,
) -> list[dict]:
    """Generate `count` validated MCQs grounded in retrieved context.

    Generates in batches of <= _BATCH_SIZE per LLM call, looping until `count`
    is reached or the attempt cap is hit. When `persist`, inserts into db.mcqs
    and returns serialized docs (with `id`); otherwise returns plain MCQ dicts.
    """
    query = f"{test_type} {subject_name} {topic_name or ''} important exam questions".strip()
    context, _hits = await retrieve_context(
        query, test_type=test_type, subject_id=subject_id, topic_id=topic_id, limit=6
    )

    collected: list[dict] = []
    attempts = 0
    while len(collected) < count and attempts < _MAX_ATTEMPTS:
        attempts += 1
        remaining = count - len(collected)
        batch = min(remaining, _BATCH_SIZE)
        messages = prompts.mcq_generation_prompt(
            test_type=test_type,
            subject=subject_name or "General",
            topic=topic_name,
            difficulty=difficulty,
            count=batch,
            context=context,
        )
        try:
            raw = await qwen_client.chat_json(messages)
        except Exception as exc:
            logger.warning(f"MCQ generation batch failed (attempt {attempts}): {exc}")
            continue

        if isinstance(raw, dict):
            # Tolerate a wrapper like {"mcqs": [...]} or {"questions": [...]}.
            for key in ("mcqs", "questions", "data", "items"):
                if isinstance(raw.get(key), list):
                    raw = raw[key]
                    break
            else:
                raw = [raw]
        if not isinstance(raw, list):
            continue

        for item in raw:
            mcq = _validate_mcq(item)
            if mcq:
                collected.append(mcq)
            if len(collected) >= count:
                break

    collected = collected[:count]

    if not collected:
        await write_system_log(
            "warning",
            "MCQ generation produced no valid questions",
            source="mcq_service",
            user_id=created_by,
            meta={"test_type": test_type, "subject_id": subject_id, "topic_id": topic_id},
        )
        return []

    if not persist:
        return collected

    now = utcnow()
    docs = []
    for mcq in collected:
        docs.append(
            {
                "question": mcq["question"],
                "options": mcq["options"],
                "answer": mcq["answer"],
                "explanation": mcq["explanation"],
                "topic": mcq["topic"] or (topic_name or ""),
                "difficulty": mcq["difficulty"] or difficulty,
                "test_type": test_type,
                "subject_id": oid(subject_id) if subject_id else None,
                "topic_id": oid(topic_id) if topic_id else None,
                "source": "ai",
                "created_by": created_by,
                "created_at": now,
            }
        )
    result = await get_db().mcqs.insert_many(docs)
    for doc, inserted_id in zip(docs, result.inserted_ids):
        doc["_id"] = inserted_id
    return [serialize(d) for d in docs]


async def get_explanation(question: str, options: dict, correct: str) -> str:
    """Produce a grounded natural-language explanation for an MCQ."""
    query = f"{question} {' '.join(str(v) for v in options.values())}".strip()
    context, _hits = await retrieve_context(query, limit=4)
    messages = prompts.explanation_prompt(question, options, correct, context=context)
    return await qwen_client.chat(messages)


async def list_mcqs(filters: dict, limit: int = 20, skip: int = 0) -> list[dict]:
    """Query db.mcqs with the given filters. `subject_id`/`topic_id` are
    matched against stored ObjectIds when valid."""
    query: dict[str, Any] = {}
    for key in ("test_type", "difficulty"):
        if filters.get(key):
            query[key] = filters[key]
    for key in ("subject_id", "topic_id"):
        val = filters.get(key)
        if val:
            try:
                query[key] = oid(val)
            except Exception:
                query[key] = val
    cursor = get_db().mcqs.find(query).sort("created_at", -1).skip(max(skip, 0)).limit(max(limit, 1))
    return [serialize(doc) async for doc in cursor]

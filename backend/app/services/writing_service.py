"""CSS Essay & Précis AI evaluation service.

Uses the Qwen model with CSS-examiner rubric prompts (see prompts.py) to score
and give structured, actionable feedback, and persists submissions to the
`writing_submissions` collection for history/analytics.
"""
from app.core.logging import logger
from app.db.mongo import get_db
from app.models.common import utcnow
from app.services import prompts, qwen_client
from app.utils.serialize import serialize


def _wc(text: str) -> int:
    return len((text or "").split())


async def generate_essay_topics(theme: str | None = None) -> list[str]:
    try:
        data = await qwen_client.chat_json(prompts.essay_topic_prompt(theme), max_tokens=600)
    except Exception as exc:
        logger.warning(f"Essay topic generation failed, using fallback: {exc}")
        data = None
    if isinstance(data, dict) and isinstance(data.get("topics"), list):
        topics = [str(t) for t in data["topics"] if t]
        if topics:
            return topics
    # Fallback bank of authentic CSS-style titles.
    return [
        "Is the pursuit of economic growth compatible with environmental sustainability?",
        "“The real test of a nation is how it treats its weakest citizens.”",
        "Artificial intelligence: emancipation or enslavement of the human mind?",
        "Democracy without an educated electorate is a contradiction in terms.",
        "Water scarcity is the defining national-security challenge of Pakistan's future.",
        "“Those who cannot change their minds cannot change anything.”",
    ]


async def evaluate_essay(*, user_id: str, topic: str, essay: str) -> dict:
    wc = _wc(essay)
    evaluation = await qwen_client.chat_json(
        prompts.essay_evaluation_prompt(topic=topic, essay=essay, word_count=wc),
        max_tokens=1500,
    )
    if not isinstance(evaluation, dict):
        raise ValueError("Evaluator did not return a valid report")
    evaluation.setdefault("word_count", wc)

    db = get_db()
    doc = {
        "user_id": str(user_id),
        "kind": "essay",
        "topic": topic,
        "text": essay,
        "word_count": wc,
        "score": evaluation.get("score"),
        "band": evaluation.get("band"),
        "evaluation": evaluation,
        "created_at": utcnow(),
    }
    res = await db.writing_submissions.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"submission_id": str(res.inserted_id), "evaluation": evaluation}


async def generate_precis_passage(theme: str | None = None) -> dict:
    try:
        data = await qwen_client.chat_json(prompts.precis_passage_prompt(theme), max_tokens=1200)
    except Exception as exc:
        logger.warning(f"Précis passage generation failed, using fallback: {exc}")
        data = None
    if isinstance(data, dict) and data.get("passage"):
        passage = str(data["passage"])
        return {"passage": passage, "word_count": _wc(passage)}
    passage = (
        "Freedom, in its truest sense, is not the absence of restraint but the presence of "
        "responsibility. Societies that mistake licence for liberty soon discover that unbridled "
        "individualism erodes the very bonds that make collective life possible. The mature citizen "
        "understands that rights and duties are inseparable twins; to claim the one while neglecting "
        "the other is to saw off the branch on which one sits. History offers abundant testimony "
        "that nations flourish not when their people are merely free to do as they please, but when "
        "that freedom is disciplined by conscience, tempered by law, and directed toward the common "
        "good. The paradox of liberty, therefore, is that it is preserved only by those willing to "
        "limit it in the name of a higher purpose."
    )
    return {"passage": passage, "word_count": _wc(passage)}


async def evaluate_precis(
    *, user_id: str, passage: str, title: str, precis: str
) -> dict:
    passage_wc = _wc(passage)
    precis_wc = _wc(precis)
    evaluation = await qwen_client.chat_json(
        prompts.precis_evaluation_prompt(
            passage=passage,
            passage_wc=passage_wc,
            title=title,
            precis=precis,
            precis_wc=precis_wc,
        ),
        max_tokens=2500,
    )
    if not isinstance(evaluation, dict):
        raise ValueError("Evaluator did not return a valid report")

    db = get_db()
    doc = {
        "user_id": str(user_id),
        "kind": "precis",
        "passage": passage,
        "title": title,
        "text": precis,
        "word_count": precis_wc,
        "score": evaluation.get("score"),
        "band": evaluation.get("band"),
        "evaluation": evaluation,
        "created_at": utcnow(),
    }
    res = await db.writing_submissions.insert_one(doc)
    return {"submission_id": str(res.inserted_id), "evaluation": evaluation}


async def list_submissions(user_id: str, kind: str | None = None, limit: int = 30) -> list[dict]:
    db = get_db()
    query: dict = {"user_id": str(user_id)}
    if kind:
        query["kind"] = kind
    cursor = db.writing_submissions.find(query).sort("created_at", -1).limit(limit)
    out = []
    async for doc in cursor:
        # Trim heavy fields for the list view.
        doc.pop("text", None)
        doc.pop("passage", None)
        doc.pop("evaluation", None)
        out.append(serialize(doc))
    return out


async def get_submission(user_id: str, submission_id: str) -> dict | None:
    from app.utils.serialize import oid

    db = get_db()
    doc = await db.writing_submissions.find_one(
        {"_id": oid(submission_id), "user_id": str(user_id)}
    )
    return serialize(doc) if doc else None

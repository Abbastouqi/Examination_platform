"""Public integrator API.

External consumers authenticate with the ``X-API-Key`` header (see
``get_api_key_owner``, which also meters one call per request). Each endpoint
additionally enforces that the calling key carries the required scope.
"""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_api_key_owner
from app.core.ratelimit import rate_limit
from app.db.mongo import get_db
from app.schemas.content import PublicAskRequest, PublicExplainRequest, PublicMCQRequest
from app.services import mcq_service, prompts, qwen_client
from app.services.rag import retrieve_context

# Per-IP burst protection on top of per-key metering in get_api_key_owner.
router = APIRouter(dependencies=[Depends(rate_limit("public_api", 60, 60))])


async def _require_scope(user: dict, scope: str) -> None:
    """403 unless the authenticating API key carries ``scope``."""
    key_id = user.get("_api_key_id")
    if not key_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing API key context")
    db = get_db()
    try:
        key_doc = await db.api_keys.find_one({"_id": ObjectId(key_id)})
    except Exception:
        key_doc = None
    scopes = (key_doc or {}).get("scopes") or []
    if scope not in scopes:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"API key is missing required scope: {scope}"
        )


@router.post("/mcqs")
async def public_generate_mcqs(
    payload: PublicMCQRequest,
    user: dict = Depends(get_api_key_owner),
) -> list[dict]:
    await _require_scope(user, "mcq")
    return await mcq_service.generate_mcqs(
        test_type=payload.test_type,
        subject_name=payload.subject,
        topic_name=payload.topic,
        difficulty=payload.difficulty,
        count=payload.count,
        persist=False,
        created_by=str(user["_id"]),
    )


@router.post("/ask")
async def public_ask(
    payload: PublicAskRequest,
    user: dict = Depends(get_api_key_owner),
) -> dict:
    await _require_scope(user, "chat")
    context, hits = await retrieve_context(payload.question, limit=6)
    messages = [
        prompts.chat_system_prompt(context=context),
        {"role": "user", "content": payload.question},
    ]
    answer = await qwen_client.chat(messages)
    sources = [
        {"source": h.get("source"), "kind": h.get("kind"), "score": h.get("score")}
        for h in hits
    ]
    return {"answer": answer, "sources": sources}


@router.post("/explain")
async def public_explain(
    payload: PublicExplainRequest,
    user: dict = Depends(get_api_key_owner),
) -> dict:
    await _require_scope(user, "mcq")
    explanation = await mcq_service.get_explanation(
        payload.question, payload.options, payload.correct
    )
    return {"explanation": explanation}

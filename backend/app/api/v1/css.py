"""CSS Preparation module: AI Essay & Précis evaluation + CSS guidance assistant."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_active_user
from app.schemas.css import CSSAskRequest, EssayEvaluateRequest, PrecisEvaluateRequest
from app.services import prompts, qwen_client, writing_service

router = APIRouter()


# --- Essay -----------------------------------------------------------------
@router.get("/essay/topics")
async def essay_topics(
    theme: str | None = Query(default=None),
    user: dict = Depends(get_current_active_user),
) -> dict:
    return {"topics": await writing_service.generate_essay_topics(theme)}


@router.post("/essay/evaluate")
async def essay_evaluate(
    payload: EssayEvaluateRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await writing_service.evaluate_essay(
        user_id=str(user["_id"]), topic=payload.topic, essay=payload.essay
    )


# --- Précis ----------------------------------------------------------------
@router.get("/precis/passage")
async def precis_passage(
    theme: str | None = Query(default=None),
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await writing_service.generate_precis_passage(theme)


@router.post("/precis/evaluate")
async def precis_evaluate(
    payload: PrecisEvaluateRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await writing_service.evaluate_precis(
        user_id=str(user["_id"]),
        passage=payload.passage,
        title=payload.title,
        precis=payload.precis,
    )


# --- CSS Guidance assistant ------------------------------------------------
@router.post("/ask")
async def css_ask(
    payload: CSSAskRequest,
    user: dict = Depends(get_current_active_user),
):
    """Answer a CSS-preparation question. Streams tokens (SSE) when
    `stream=true`, otherwise returns the full answer as JSON."""
    messages = [
        {"role": "system", "content": prompts.CSS_GUIDE_SYSTEM},
        {"role": "user", "content": payload.question},
    ]

    if payload.stream:

        async def event_generator():
            try:
                async for delta in qwen_client.chat_stream(
                    messages, temperature=0.3, max_tokens=1200
                ):
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
            except Exception as exc:  # surface streaming errors to the client
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    answer = await qwen_client.chat(messages, temperature=0.3, max_tokens=1200)
    return {"answer": answer}


# --- History ---------------------------------------------------------------
@router.get("/submissions")
async def submissions(
    kind: str | None = Query(default=None, description="essay | precis"),
    user: dict = Depends(get_current_active_user),
) -> list[dict]:
    return await writing_service.list_submissions(str(user["_id"]), kind)


@router.get("/submissions/{submission_id}")
async def submission_detail(
    submission_id: str,
    user: dict = Depends(get_current_active_user),
) -> dict:
    doc = await writing_service.get_submission(str(user["_id"]), submission_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
    return doc

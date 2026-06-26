"""MCQ endpoints: AI generation, bank listing/filtering, and explanations."""
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_active_user
from app.schemas.mcq import ExplanationRequest, GenerateMCQRequest
from app.services import mcq_service
from app.services.quota import check_and_consume

router = APIRouter()


@router.post("/generate")
async def generate(
    payload: GenerateMCQRequest,
    user: dict = Depends(get_current_active_user),
) -> list[dict]:
    uid = str(user["_id"])
    await check_and_consume(uid, "mcq")
    return await mcq_service.generate_mcqs(
        test_type=payload.test_type.value,
        subject_id=payload.subject_id,
        subject_name=payload.subject_name,
        topic_id=payload.topic_id,
        topic_name=payload.topic_name,
        difficulty=payload.difficulty.value,
        count=payload.count,
        persist=True,
        created_by=uid,
    )


@router.get("/")
async def list_mcqs(
    test_type: str | None = Query(default=None),
    subject_id: str | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_active_user),
) -> list[dict]:
    filters = {
        "test_type": test_type,
        "subject_id": subject_id,
        "topic_id": topic_id,
        "difficulty": difficulty,
    }
    return await mcq_service.list_mcqs(filters, limit=limit, skip=skip)


@router.post("/explain")
async def explain(
    payload: ExplanationRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    explanation = await mcq_service.get_explanation(
        payload.question, payload.options, payload.correct
    )
    return {"explanation": explanation}

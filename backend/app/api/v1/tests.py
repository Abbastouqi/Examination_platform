"""Mock-test endpoints: create tests, run attempts, grade, and review."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import get_current_active_user
from app.schemas.tests import CreateTestRequest, SubmitAttemptRequest
from app.services import test_service
from app.services.quota import check_and_consume

router = APIRouter()


class CategoryTestRequest(BaseModel):
    test_type: str = "FPSC"
    categories: list[str] = Field(default_factory=list)
    num_questions: int = Field(default=20, ge=1, le=200)
    duration_minutes: int = Field(default=30, ge=1, le=300)
    negative_marking: bool = False
    negative_mark: float = Field(default=0.25, ge=0, le=1)


# --- Category-wise FPSC/NTS mock builder (declared before /{test_id}) -------
@router.get("/categories")
async def list_categories(
    test_type: str | None = Query(default=None),
    user: dict = Depends(get_current_active_user),
) -> list[dict]:
    return await test_service.list_categories(test_type)


@router.post("/category")
async def create_category_test(
    payload: CategoryTestRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    uid = str(user["_id"])
    await check_and_consume(uid, "mocktest")
    return await test_service.create_category_test(
        user_id=uid,
        test_type=payload.test_type,
        categories=payload.categories,
        num_questions=payload.num_questions,
        duration_minutes=payload.duration_minutes,
        negative_marking=payload.negative_marking,
        negative_mark=payload.negative_mark,
    )


@router.get("/attempts")
async def list_attempts(user: dict = Depends(get_current_active_user)) -> list[dict]:
    return await test_service.list_attempts(str(user["_id"]))


@router.post("/")
async def create_test(
    payload: CreateTestRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    uid = str(user["_id"])
    await check_and_consume(uid, "mocktest")
    section_spec = (
        [s.model_dump() for s in payload.section_spec] if payload.section_spec else None
    )
    return await test_service.create_test(
        user_id=uid,
        title=payload.title,
        test_type=payload.test_type.value,
        mode=payload.mode.value,
        subject_ids=payload.subject_ids,
        topic_ids=payload.topic_ids,
        difficulty=payload.difficulty.value,
        num_questions=payload.num_questions,
        duration_minutes=payload.duration_minutes,
        section_spec=section_spec,
    )


@router.get("/")
async def list_tests(user: dict = Depends(get_current_active_user)) -> list[dict]:
    return await test_service.list_tests(str(user["_id"]))


@router.get("/{test_id}")
async def get_test(test_id: str, user: dict = Depends(get_current_active_user)) -> dict:
    return await test_service.get_test(str(user["_id"]), test_id)


@router.post("/{test_id}/start")
async def start_attempt(test_id: str, user: dict = Depends(get_current_active_user)) -> dict:
    return await test_service.start_attempt(str(user["_id"]), test_id)


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(
    attempt_id: str,
    payload: SubmitAttemptRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await test_service.submit_attempt(str(user["_id"]), attempt_id, payload.answers)


@router.get("/attempts/{attempt_id}/result")
async def get_result(attempt_id: str, user: dict = Depends(get_current_active_user)) -> dict:
    return await test_service.get_result(str(user["_id"]), attempt_id)


@router.get("/attempts/{attempt_id}/review")
async def get_review(attempt_id: str, user: dict = Depends(get_current_active_user)) -> dict:
    return await test_service.get_review(str(user["_id"]), attempt_id)

"""Analytics & coaching endpoints: performance, weak areas, study plans, recs."""
from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.schemas.chat import StudyPlanRequest
from app.services import analytics_service

router = APIRouter()


@router.get("/overview")
async def overview(user: dict = Depends(get_current_active_user)) -> dict:
    return await analytics_service.performance_overview(str(user["_id"]))


@router.get("/weak-areas")
async def weak_areas(user: dict = Depends(get_current_active_user)) -> dict:
    return await analytics_service.weak_area_analysis(str(user["_id"]))


@router.post("/study-plan")
async def study_plan(
    payload: StudyPlanRequest,
    user: dict = Depends(get_current_active_user),
) -> dict:
    return await analytics_service.generate_study_plan(
        str(user["_id"]),
        test_type=payload.test_type.value,
        subject=payload.subject,
        days=payload.days,
        hours_per_day=payload.hours_per_day,
    )


@router.get("/recommendations")
async def recommendations(user: dict = Depends(get_current_active_user)) -> dict:
    return await analytics_service.recommend_topics(str(user["_id"]))


@router.get("/study-plans")
async def study_plans(user: dict = Depends(get_current_active_user)) -> list:
    return await analytics_service.list_study_plans(str(user["_id"]))

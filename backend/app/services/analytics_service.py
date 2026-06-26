"""Analytics & coaching service: performance aggregation, weak-area analysis,
AI study plans, and topic recommendations.

Reads submitted attempts (read-only) and persists generated study plans to
`study_plans`. Per-topic accuracy is computed from each attempt's `per_topic`
map of {topic: {correct, total}}.
"""
from app.db.mongo import get_db
from app.models.common import AttemptStatus, utcnow
from app.services import prompts, qwen_client
from app.services.rag import retrieve_context
from app.utils.serialize import serialize


def _accuracy(correct: int, total: int) -> float:
    return round(correct / total, 4) if total else 0.0


async def _submitted_attempts(user_id: str) -> list[dict]:
    cursor = (
        get_db()
        .attempts.find({"user_id": user_id, "status": AttemptStatus.SUBMITTED.value})
        .sort("created_at", 1)
    )
    return [doc async for doc in cursor]


async def _test_meta(attempts: list[dict]) -> dict:
    """Map test_id -> {test_type, title} for the given attempts."""
    test_ids = list({a["test_id"] for a in attempts if a.get("test_id")})
    if not test_ids:
        return {}
    cursor = get_db().tests.find(
        {"_id": {"$in": test_ids}}, {"test_type": 1, "title": 1}
    )
    return {doc["_id"]: doc async for doc in cursor}


async def performance_overview(user_id: str) -> dict:
    """Aggregate the user's submitted attempts into a dashboard summary."""
    attempts = await _submitted_attempts(user_id)
    if not attempts:
        return {
            "total_tests": 0,
            "avg_score": 0.0,
            "total_questions": 0,
            "overall_accuracy": 0.0,
            "per_subject": [],
            "per_topic": [],
            "score_trend": [],
            "recent_attempts": [],
        }

    meta = await _test_meta(attempts)

    total_tests = len(attempts)
    total_questions = sum(int(a.get("total") or 0) for a in attempts)
    total_correct = sum(int(a.get("correct") or 0) for a in attempts)
    score_sum = sum(float(a.get("score") or 0.0) for a in attempts)

    per_topic: dict[str, dict[str, int]] = {}
    per_subject: dict[str, dict[str, int]] = {}
    score_trend: list[dict] = []
    recent_attempts: list[dict] = []

    for a in attempts:
        for topic, stats in (a.get("per_topic") or {}).items():
            bucket = per_topic.setdefault(topic, {"correct": 0, "total": 0})
            bucket["correct"] += int(stats.get("correct", 0))
            bucket["total"] += int(stats.get("total", 0))

        # Subject derived from the test type (closest grouping available here).
        test = meta.get(a.get("test_id"), {})
        subject = a.get("test_type") or test.get("test_type") or "General"
        sb = per_subject.setdefault(subject, {"correct": 0, "total": 0})
        sb["correct"] += int(a.get("correct") or 0)
        sb["total"] += int(a.get("total") or 0)

        created = a.get("created_at")
        date_str = created.strftime("%Y-%m-%d") if created else None
        score_trend.append({"date": date_str, "score": float(a.get("score") or 0.0)})

    per_topic_out = sorted(
        (
            {"topic": t, "accuracy": _accuracy(s["correct"], s["total"]), **s}
            for t, s in per_topic.items()
        ),
        key=lambda x: x["accuracy"],
    )
    per_subject_out = sorted(
        (
            {"subject": sub, "accuracy": _accuracy(s["correct"], s["total"]), **s}
            for sub, s in per_subject.items()
        ),
        key=lambda x: x["accuracy"],
    )

    # Most recent 5 attempts (attempts are sorted ascending by created_at).
    for a in reversed(attempts[-5:]):
        test = meta.get(a.get("test_id"), {})
        created = a.get("created_at")
        recent_attempts.append(
            {
                "attempt_id": str(a["_id"]),
                "test_id": str(a["test_id"]) if a.get("test_id") else None,
                "test_title": test.get("title"),
                "test_type": a.get("test_type") or test.get("test_type"),
                "score": a.get("score"),
                "total": a.get("total"),
                "correct": a.get("correct"),
                "wrong": a.get("wrong"),
                "skipped": a.get("skipped"),
                "time_taken_seconds": a.get("time_taken_seconds"),
                "created_at": created.isoformat() if created else None,
            }
        )

    return {
        "total_tests": total_tests,
        "avg_score": round(score_sum / total_tests, 2) if total_tests else 0.0,
        "total_questions": total_questions,
        "overall_accuracy": _accuracy(total_correct, total_questions),
        "per_subject": per_subject_out,
        "per_topic": per_topic_out,
        "score_trend": score_trend,
        "recent_attempts": recent_attempts,
    }


def _performance_summary(per_topic: list[dict], per_subject: list[dict], avg_score: float) -> str:
    """Render an aggregate accuracy table into a compact text summary for the LLM."""
    lines = [f"Overall average score: {avg_score}%."]
    if per_subject:
        lines.append("\nPer-subject accuracy:")
        for s in per_subject:
            lines.append(
                f"- {s['subject']}: {round(s['accuracy'] * 100, 1)}% "
                f"({s['correct']}/{s['total']})"
            )
    if per_topic:
        lines.append("\nPer-topic accuracy (worst first):")
        for t in per_topic:
            lines.append(
                f"- {t['topic']}: {round(t['accuracy'] * 100, 1)}% "
                f"({t['correct']}/{t['total']})"
            )
    return "\n".join(lines)


async def weak_area_analysis(user_id: str) -> dict:
    """Summarise per-topic performance and ask the model for targeted advice."""
    overview = await performance_overview(user_id)
    if not overview["total_tests"]:
        return {
            "weak_areas": [],
            "strong_areas": [],
            "recommended_topics": [],
            "advice": "No completed tests yet. Take a mock test to unlock personalised analysis.",
        }

    summary = _performance_summary(
        overview["per_topic"], overview["per_subject"], overview["avg_score"]
    )
    result = await qwen_client.chat_json(prompts.weak_area_prompt(summary))
    if not isinstance(result, dict):
        result = {}
    result.setdefault("weak_areas", [])
    result.setdefault("strong_areas", [])
    result.setdefault("recommended_topics", [])
    result.setdefault("advice", "")
    return result


def _weak_area_labels(analysis: dict) -> list[str]:
    labels = []
    for w in analysis.get("weak_areas", []):
        if isinstance(w, dict) and w.get("area"):
            labels.append(str(w["area"]))
        elif isinstance(w, str):
            labels.append(w)
    return labels


async def generate_study_plan(
    user_id: str, *, test_type: str, subject: str, days: int, hours_per_day: int
) -> dict:
    """Generate a syllabus-grounded study plan and persist it."""
    query = f"{test_type} {subject} syllabus topics and exam pattern"
    context, _ = await retrieve_context(query, test_type=test_type)

    try:
        analysis = await weak_area_analysis(user_id)
        weak_areas = _weak_area_labels(analysis)
    except Exception:
        weak_areas = []

    plan = await qwen_client.chat_json(
        prompts.study_plan_prompt(
            test_type=test_type,
            subject=subject,
            days=days,
            hours_per_day=hours_per_day,
            context=context,
            weak_areas=weak_areas,
        )
    )

    doc = {
        "user_id": user_id,
        "test_type": test_type,
        "subject": subject,
        "days": days,
        "hours_per_day": hours_per_day,
        "plan": plan,
        "weak_areas": weak_areas,
        "created_at": utcnow(),
    }
    result = await get_db().study_plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


async def list_study_plans(user_id: str) -> list[dict]:
    cursor = get_db().study_plans.find({"user_id": user_id}).sort("created_at", -1)
    return [serialize(doc) async for doc in cursor]


async def recommend_topics(user_id: str) -> dict:
    """Rank weakest topics deterministically, blended with AI recommendations."""
    overview = await performance_overview(user_id)
    if not overview["total_tests"]:
        return {
            "recommended": [],
            "message": "No attempts yet. Take a test to get topic recommendations.",
        }

    # Deterministic ranking: weakest accuracy first, requiring some signal (>=3 Qs).
    ranked = [
        {
            "topic": t["topic"],
            "accuracy": t["accuracy"],
            "attempted": t["total"],
            "reason": f"{round(t['accuracy'] * 100, 1)}% accuracy over {t['total']} questions",
        }
        for t in overview["per_topic"]
        if t["total"] >= 3
    ]
    # per_topic is already sorted ascending by accuracy; cap to top 5 weakest.
    recommended = ranked[:5]

    ai_topics: list[str] = []
    try:
        analysis = await weak_area_analysis(user_id)
        ai_topics = [str(x) for x in analysis.get("recommended_topics", []) if x]
    except Exception:
        ai_topics = []

    return {
        "recommended": recommended,
        "ai_recommended_topics": ai_topics,
    }

"""Mock-test lifecycle: build tests, run attempts, grade, and review.

Tests draw MCQs from the bank (db.mcqs) and top up with freshly generated
MCQs when the bank is short. Attempts grade answers server-side; the correct
answer and explanation are never exposed while an attempt is in progress.
"""
from typing import Any

from fastapi import HTTPException, status

from app.db.mongo import get_db
from app.models.common import AttemptStatus, TestMode, utcnow
from app.services import mcq_service
from app.utils.serialize import oid, serialize


def _public_question(mcq: dict) -> dict:
    """Strip answer/explanation so the client cannot cheat mid-attempt."""
    return {
        "id": str(mcq["_id"]),
        "question": mcq.get("question"),
        "options": mcq.get("options"),
        "topic": mcq.get("topic"),
        "difficulty": mcq.get("difficulty"),
    }


async def _gather_mcqs(
    *,
    test_type: str,
    difficulty: str,
    count: int,
    subject_id: str | None,
    subject_name: str,
    topic_id: str | None,
    topic_name: str | None,
    created_by: str,
) -> list[Any]:
    """Pull up to `count` MCQ _ids matching the filters, topping up with
    generated MCQs when the bank is short. Returns a list of ObjectIds."""
    db = get_db()
    query: dict[str, Any] = {"test_type": test_type}
    if subject_id:
        query["subject_id"] = oid(subject_id)
    if topic_id:
        query["topic_id"] = oid(topic_id)
    if difficulty and difficulty != "mixed":
        query["difficulty"] = difficulty

    existing = [doc["_id"] async for doc in db.mcqs.find(query, {"_id": 1}).limit(count)]

    shortfall = count - len(existing)
    if shortfall > 0:
        generated = await mcq_service.generate_mcqs(
            test_type=test_type,
            subject_id=subject_id,
            subject_name=subject_name,
            topic_id=topic_id,
            topic_name=topic_name,
            difficulty=difficulty,
            count=shortfall,
            persist=True,
            created_by=created_by,
        )
        existing.extend(oid(g["id"]) for g in generated)

    return existing[:count]


async def _subject_name(subject_id: str | None) -> str:
    if not subject_id:
        return ""
    doc = await get_db().subjects.find_one({"_id": oid(subject_id)}, {"name": 1})
    return doc.get("name", "") if doc else ""


async def _topic_name(topic_id: str | None) -> str | None:
    if not topic_id:
        return None
    doc = await get_db().topics.find_one({"_id": oid(topic_id)}, {"name": 1})
    return doc.get("name") if doc else None


async def create_test(
    *,
    user_id: str,
    title: str,
    test_type: str,
    mode: str,
    subject_ids: list[str],
    topic_ids: list[str],
    difficulty: str,
    num_questions: int,
    duration_minutes: int,
    section_spec: list[dict] | None = None,
) -> dict:
    """Assemble a test from bank + generated MCQs and persist it."""
    db = get_db()
    mcq_ids: list[Any] = []
    sections: list[dict] = []

    if mode == TestMode.FULL.value and section_spec:
        for spec in section_spec:
            s_id = spec.get("subject_id")
            s_name = spec.get("name") or await _subject_name(s_id)
            s_count = int(spec.get("count", 0))
            if s_count <= 0:
                continue
            ids = await _gather_mcqs(
                test_type=test_type,
                difficulty=difficulty,
                count=s_count,
                subject_id=s_id,
                subject_name=s_name,
                topic_id=None,
                topic_name=None,
                created_by=user_id,
            )
            sections.append({"name": s_name, "mcq_ids": ids})
            mcq_ids.extend(ids)

    elif mode == TestMode.TOPIC.value:
        topic_id = topic_ids[0] if topic_ids else None
        subject_id = subject_ids[0] if subject_ids else None
        mcq_ids = await _gather_mcqs(
            test_type=test_type,
            difficulty=difficulty,
            count=num_questions,
            subject_id=subject_id,
            subject_name=await _subject_name(subject_id),
            topic_id=topic_id,
            topic_name=await _topic_name(topic_id),
            created_by=user_id,
        )

    elif mode == TestMode.SUBJECT.value:
        subject_id = subject_ids[0] if subject_ids else None
        mcq_ids = await _gather_mcqs(
            test_type=test_type,
            difficulty=difficulty,
            count=num_questions,
            subject_id=subject_id,
            subject_name=await _subject_name(subject_id),
            topic_id=None,
            topic_name=None,
            created_by=user_id,
        )

    else:  # full without explicit section_spec: spread across given subjects
        targets = subject_ids or [None]
        per = max(1, num_questions // len(targets))
        for idx, subject_id in enumerate(targets):
            remaining = num_questions - len(mcq_ids)
            want = remaining if idx == len(targets) - 1 else min(per, remaining)
            if want <= 0:
                break
            s_name = await _subject_name(subject_id)
            ids = await _gather_mcqs(
                test_type=test_type,
                difficulty=difficulty,
                count=want,
                subject_id=subject_id,
                subject_name=s_name,
                topic_id=None,
                topic_name=None,
                created_by=user_id,
            )
            if subject_id:
                sections.append({"name": s_name or "Section", "mcq_ids": ids})
            mcq_ids.extend(ids)

    doc = {
        "user_id": user_id,
        "title": title,
        "test_type": test_type,
        "mode": mode,
        "subject_ids": [oid(s) for s in subject_ids if s],
        "topic_ids": [oid(t) for t in topic_ids if t],
        "difficulty": difficulty,
        "num_questions": len(mcq_ids),
        "duration_minutes": duration_minutes,
        "mcq_ids": mcq_ids,
        "sections": sections,
        "created_at": utcnow(),
    }
    result = await db.tests.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


async def _owned_test(user_id: str, test_id: str) -> dict:
    try:
        tid = oid(test_id)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    test = await get_db().tests.find_one({"_id": tid, "user_id": user_id})
    if not test:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")
    return test


async def _owned_attempt(user_id: str, attempt_id: str) -> dict:
    try:
        aid = oid(attempt_id)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    attempt = await get_db().attempts.find_one({"_id": aid, "user_id": user_id})
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    return attempt


async def _test_mcqs(test: dict, projection: dict | None = None) -> list[dict]:
    """Fetch the test's MCQs in the order stored on the test."""
    ids = test.get("mcq_ids", [])
    if not ids:
        return []
    cursor = get_db().mcqs.find({"_id": {"$in": ids}}, projection)
    by_id = {doc["_id"]: doc async for doc in cursor}
    return [by_id[i] for i in ids if i in by_id]


async def start_attempt(user_id: str, test_id: str) -> dict:
    """Create an in-progress attempt and return the questions WITHOUT answers."""
    test = await _owned_test(user_id, test_id)
    now = utcnow()
    attempt_doc = {
        "user_id": user_id,
        "test_id": test["_id"],
        "status": AttemptStatus.IN_PROGRESS.value,
        "answers": {},
        "started_at": now,
        "submitted_at": None,
        "time_taken_seconds": None,
        "score": None,
        "total": len(test.get("mcq_ids", [])),
        "correct": None,
        "wrong": None,
        "skipped": None,
        "per_topic": {},
        "created_at": now,
    }
    result = await get_db().attempts.insert_one(attempt_doc)
    attempt_doc["_id"] = result.inserted_id

    mcqs = await _test_mcqs(test)
    questions = [_public_question(m) for m in mcqs]
    return {
        "attempt": serialize(attempt_doc),
        "test": {
            "id": str(test["_id"]),
            "title": test.get("title"),
            "duration_minutes": test.get("duration_minutes"),
            "num_questions": test.get("num_questions"),
            "test_type": test.get("test_type"),
            "mode": test.get("mode"),
        },
        "questions": questions,
    }


async def submit_attempt(user_id: str, attempt_id: str, answers: dict) -> dict:
    """Grade the attempt against the bank, persist results, return a summary."""
    attempt = await _owned_attempt(user_id, attempt_id)
    if attempt.get("status") == AttemptStatus.SUBMITTED.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Attempt already submitted")

    test = await get_db().tests.find_one({"_id": attempt["test_id"]})
    if not test:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")

    mcqs = await _test_mcqs(test)
    total = len(mcqs)
    correct = wrong = skipped = 0
    per_topic: dict[str, dict[str, int]] = {}

    answers = {str(k): str(v).strip().upper() for k, v in (answers or {}).items()}

    for mcq in mcqs:
        mid = str(mcq["_id"])
        topic = mcq.get("topic") or "General"
        bucket = per_topic.setdefault(topic, {"correct": 0, "total": 0})
        bucket["total"] += 1
        given = answers.get(mid)
        if not given:
            skipped += 1
            continue
        if given == str(mcq.get("answer", "")).strip().upper():
            correct += 1
            bucket["correct"] += 1
        else:
            wrong += 1

    score = round((correct / total) * 100, 2) if total else 0.0
    now = utcnow()
    started = attempt.get("started_at")
    time_taken = int((now - started).total_seconds()) if started else None

    update = {
        "status": AttemptStatus.SUBMITTED.value,
        "answers": answers,
        "submitted_at": now,
        "time_taken_seconds": time_taken,
        "score": score,
        "total": total,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "per_topic": per_topic,
    }
    await get_db().attempts.update_one({"_id": attempt["_id"]}, {"$set": update})

    return {
        "attempt_id": str(attempt["_id"]),
        "test_id": str(test["_id"]),
        "status": AttemptStatus.SUBMITTED.value,
        "score": score,
        "total": total,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "time_taken_seconds": time_taken,
        "per_topic": per_topic,
    }


async def get_result(user_id: str, attempt_id: str) -> dict:
    """Return the graded summary for a submitted attempt."""
    attempt = await _owned_attempt(user_id, attempt_id)
    return {
        "attempt_id": str(attempt["_id"]),
        "test_id": str(attempt["test_id"]),
        "status": attempt.get("status"),
        "score": attempt.get("score"),
        "total": attempt.get("total"),
        "correct": attempt.get("correct"),
        "wrong": attempt.get("wrong"),
        "skipped": attempt.get("skipped"),
        "time_taken_seconds": attempt.get("time_taken_seconds"),
        "per_topic": attempt.get("per_topic", {}),
    }


async def get_review(user_id: str, attempt_id: str) -> dict:
    """Return every question with the user's answer, correct answer,
    explanation, and correctness flag."""
    attempt = await _owned_attempt(user_id, attempt_id)
    test = await get_db().tests.find_one({"_id": attempt["test_id"]})
    if not test:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test not found")

    mcqs = await _test_mcqs(test)
    answers = attempt.get("answers", {})
    items = []
    for mcq in mcqs:
        mid = str(mcq["_id"])
        given = answers.get(mid)
        correct_ans = str(mcq.get("answer", "")).strip().upper()
        items.append(
            {
                "id": mid,
                "question": mcq.get("question"),
                "options": mcq.get("options"),
                "topic": mcq.get("topic"),
                "difficulty": mcq.get("difficulty"),
                "user_answer": given,
                "correct_answer": correct_ans,
                "is_correct": given == correct_ans if given else False,
                "explanation": mcq.get("explanation"),
            }
        )
    return {
        "attempt_id": str(attempt["_id"]),
        "test_id": str(test["_id"]),
        "status": attempt.get("status"),
        "score": attempt.get("score"),
        "questions": items,
    }


async def list_tests(user_id: str) -> list[dict]:
    cursor = get_db().tests.find({"user_id": user_id}).sort("created_at", -1)
    return [serialize(doc) async for doc in cursor]


async def get_test(user_id: str, test_id: str) -> dict:
    test = await _owned_test(user_id, test_id)
    return serialize(test)

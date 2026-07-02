"""Seed the curated FPSC/NTS question bank into the `mcqs` collection.

Idempotent: clears previously seeded bank questions (source="bank") and
re-inserts. Run:  python -m app.scripts.seed_questions
"""
import asyncio

from app.db.mongo import close_mongo_connection, connect_to_mongo, get_db
from app.models.common import utcnow
from app.scripts.question_bank import BANK, CATEGORY_EXAMS


async def seed() -> None:
    db = get_db()
    removed = (await db.mcqs.delete_many({"source": "bank"})).deleted_count

    docs = []
    now = utcnow()
    for category, items in BANK.items():
        exams = CATEGORY_EXAMS.get(category, ["FPSC"])
        for it in items:
            docs.append(
                {
                    "question": it["q"],
                    "options": it["o"],
                    "answer": it["a"],
                    "explanation": it["e"],
                    "topic": category,
                    "category": category,
                    "difficulty": it.get("d", "medium"),
                    "test_type": exams[0],
                    "test_types": exams,
                    "subject_id": None,
                    "topic_id": None,
                    "source": "bank",
                    "created_at": now,
                }
            )
    if docs:
        await db.mcqs.insert_many(docs)

    # Helpful index for category-wise mock tests.
    await db.mcqs.create_index([("category", 1), ("test_types", 1)])

    print("=" * 48)
    print("Question bank seed")
    print("-" * 48)
    print(f"Removed old bank questions: {removed}")
    print(f"Inserted: {len(docs)} across {len(BANK)} categories")
    for c, items in BANK.items():
        print(f"  {c:<22} {len(items)}")
    print("=" * 48)


async def main() -> None:
    await connect_to_mongo()
    try:
        await seed()
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())

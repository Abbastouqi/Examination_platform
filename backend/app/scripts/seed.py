"""Bootstrap/seed script — admin user + subjects/topics for Pakistani exams.

Run standalone:  python -m app.scripts.seed

Idempotent: safe to run repeatedly. Subjects and topics are upserted by slug,
and the admin user is created only if missing (its role is repaired to admin
if it already exists).
"""
import asyncio

from slugify import slugify

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.db.mongo import connect_to_mongo, close_mongo_connection, get_db
from app.models.common import Role, utcnow

# --- Subject / topic catalogue --------------------------------------------
# (name, [test_types], [topics])
SUBJECTS: list[tuple[str, list[str], list[str]]] = [
    (
        "English",
        ["FPSC", "NTS", "PPSC", "CSS", "PMS", "FGEI_EST", "LECTURER"],
        ["Grammar", "Vocabulary", "Comprehension", "Sentence Correction",
         "Synonyms & Antonyms", "Idioms & Phrases"],
    ),
    (
        "General Knowledge",
        ["FPSC", "NTS", "PPSC", "CSS", "PMS"],
        ["World Geography", "Science & Technology", "Sports", "Awards",
         "Organizations", "Inventions"],
    ),
    (
        "Pakistan Affairs",
        ["FPSC", "PPSC", "CSS", "PMS"],
        ["Pakistan Movement", "Constitution", "Geography of Pakistan", "Economy",
         "Foreign Policy", "Notable Personalities"],
    ),
    (
        "Islamic Studies",
        ["FPSC", "PPSC", "CSS", "PMS"],
        ["Quran", "Seerah", "Fiqh", "Islamic History", "Pillars of Islam", "Hadith"],
    ),
    (
        "Current Affairs",
        ["FPSC", "NTS", "PPSC", "CSS", "PMS"],
        ["National", "International", "Economy", "Sports", "Science", "Important Days"],
    ),
    (
        "Analytical Reasoning",
        ["FPSC", "NTS", "CSS", "PMS"],
        ["Logical Deduction", "Series", "Analogies", "Coding-Decoding",
         "Critical Reasoning"],
    ),
    (
        "General Science",
        ["FGEI_EST", "NTS", "PPSC"],
        ["Physics", "Chemistry", "Biology", "Environmental Science",
         "Everyday Science", "Earth Science"],
    ),
    (
        "Mathematics",
        ["FGEI_EST", "NTS", "PPSC", "LECTURER"],
        ["Arithmetic", "Algebra", "Geometry", "Statistics", "Word Problems",
         "Number System"],
    ),
    (
        "Pedagogy",
        ["FGEI_EST"],
        ["Teaching Methods", "Educational Psychology", "Assessment",
         "Classroom Management", "Curriculum", "Child Development"],
    ),
    (
        "Computer Science",
        ["NTS", "PPSC", "LECTURER"],
        ["Fundamentals", "Programming", "Databases", "Networking",
         "Operating Systems", "Web"],
    ),
]


async def _seed_admin() -> str:
    db = get_db()
    email = settings.ADMIN_EMAIL.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("role") != Role.ADMIN.value:
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"role": Role.ADMIN.value, "updated_at": utcnow()}},
            )
            return "repaired"
        return "exists"

    now = utcnow()
    await db.users.insert_one(
        {
            "email": email,
            "hashed_password": hash_password(settings.ADMIN_PASSWORD),
            "full_name": "Administrator",
            "role": Role.ADMIN.value,
            "is_active": True,
            "is_verified": True,
            "google_id": None,
            "avatar_url": None,
            "target_exams": [],
            "created_at": now,
            "updated_at": now,
        }
    )
    return "created"


async def _seed_subjects() -> dict[str, int]:
    db = get_db()
    counts = {"subjects_created": 0, "subjects_updated": 0,
              "topics_created": 0, "topics_updated": 0}

    for name, test_types, topics in SUBJECTS:
        subject_slug = slugify(name)
        now = utcnow()
        res = await db.subjects.update_one(
            {"slug": subject_slug},
            {
                "$set": {
                    "name": name,
                    "test_types": test_types,
                    "description": f"{name} for Pakistani competitive exams.",
                    "updated_at": now,
                },
                "$setOnInsert": {"slug": subject_slug, "created_at": now},
            },
            upsert=True,
        )
        if res.upserted_id is not None:
            counts["subjects_created"] += 1
        else:
            counts["subjects_updated"] += 1

        subject_doc = await db.subjects.find_one({"slug": subject_slug}, {"_id": 1})
        # Store as ObjectId to match how the API (admin.py, mcq/test services) reads it.
        subject_id = subject_doc["_id"]

        for order, topic_name in enumerate(topics):
            topic_slug = slugify(topic_name)
            tnow = utcnow()
            tres = await db.topics.update_one(
                {"subject_id": subject_id, "slug": topic_slug},
                {
                    "$set": {
                        "name": topic_name,
                        "subject_id": subject_id,
                        "subject_slug": subject_slug,
                        "order": order,
                        "updated_at": tnow,
                    },
                    "$setOnInsert": {"slug": topic_slug, "created_at": tnow},
                },
                upsert=True,
            )
            if tres.upserted_id is not None:
                counts["topics_created"] += 1
            else:
                counts["topics_updated"] += 1

    return counts


async def main() -> None:
    await connect_to_mongo()
    try:
        admin_status = await _seed_admin()
        counts = await _seed_subjects()

        print("=" * 48)
        print("Seed summary")
        print("-" * 48)
        print(f"Admin user ({settings.ADMIN_EMAIL}): {admin_status}")
        print(f"Subjects created:  {counts['subjects_created']}")
        print(f"Subjects updated:  {counts['subjects_updated']}")
        print(f"Topics created:    {counts['topics_created']}")
        print(f"Topics updated:    {counts['topics_updated']}")
        print("=" * 48)
        logger.info(f"Seed complete: admin={admin_status}, {counts}")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())

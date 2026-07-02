"""Guest trial: a few free sample MCQs served WITHOUT authentication.

Lets prospective users experience the mock-test feel before signing up.
The frontend shows these, grades locally, then gates further access behind
signup/login.
"""
from fastapi import APIRouter, Depends

from app.core.ratelimit import rate_limit

router = APIRouter()

# Curated FPSC/NTS-style sample questions (original, exam-style — not copied papers).
_TRIAL_QUESTIONS = [
    {
        "id": "trial-1",
        "category": "Pakistan Affairs",
        "question": "The Objectives Resolution was passed by the Constituent Assembly of Pakistan in which year?",
        "options": {"A": "1947", "B": "1949", "C": "1956", "D": "1962"},
        "answer": "B",
        "explanation": "The Objectives Resolution was passed on 12 March 1949; it later became a substantive part of the Constitution.",
    },
    {
        "id": "trial-2",
        "category": "General Knowledge",
        "question": "Which is the largest ocean on Earth by surface area?",
        "options": {"A": "Atlantic", "B": "Indian", "C": "Arctic", "D": "Pacific"},
        "answer": "D",
        "explanation": "The Pacific Ocean is the largest and deepest of the world's oceans.",
    },
    {
        "id": "trial-3",
        "category": "English",
        "question": "Choose the correct synonym of the word 'ubiquitous'.",
        "options": {"A": "Rare", "B": "Omnipresent", "C": "Hidden", "D": "Temporary"},
        "answer": "B",
        "explanation": "'Ubiquitous' means present everywhere at once — i.e. omnipresent.",
    },
    {
        "id": "trial-4",
        "category": "Everyday Science",
        "question": "Which gas is most abundant in the Earth's atmosphere?",
        "options": {"A": "Oxygen", "B": "Carbon dioxide", "C": "Nitrogen", "D": "Hydrogen"},
        "answer": "C",
        "explanation": "Nitrogen makes up about 78% of the atmosphere by volume; oxygen is about 21%.",
    },
    {
        "id": "trial-5",
        "category": "Analytical Reasoning",
        "question": "If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely:",
        "options": {"A": "Lazzies", "B": "Not Lazzies", "C": "Only some Lazzies", "D": "Cannot be determined"},
        "answer": "A",
        "explanation": "By transitivity: Bloops ⊆ Razzies ⊆ Lazzies, so every Bloop is a Lazzie.",
    },
]


@router.get("/questions", dependencies=[Depends(rate_limit("trial", 40, 3600))])
async def trial_questions() -> dict:
    """Return the free sample questions for guests (with answers for local grading)."""
    return {"count": len(_TRIAL_QUESTIONS), "questions": _TRIAL_QUESTIONS}

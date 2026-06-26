"""Prompt templates for all AI flows. Centralised so they can be tuned/versioned."""

EXAM_CONTEXT = {
    "FPSC": "Federal Public Service Commission — federal jobs, CSS screening; analytical, current affairs, GK heavy.",
    "NTS": "National Testing Service — standardized aptitude + subject tests for admissions/jobs.",
    "PPSC": "Punjab Public Service Commission — provincial Punjab government posts.",
    "FGEI_EST": "Federal Govt Educational Institutions — Elementary School Teacher; pedagogy + subject (Science/Math/English).",
    "LECTURER": "Subject Specialist / Lecturer — deep single-subject mastery (e.g. Physics, English, IT).",
    "PMS": "Provincial Management Service — provincial equivalent of CSS; essay, GK, optional subjects.",
    "CSS": "Central Superior Services — compulsory + optional subjects; high difficulty, analytical depth.",
    "OTHER": "General competitive examination preparation.",
}


def mcq_generation_prompt(
    *, test_type: str, subject: str, topic: str | None, difficulty: str, count: int, context: str
) -> list[dict]:
    exam = EXAM_CONTEXT.get(test_type, EXAM_CONTEXT["OTHER"])
    topic_line = f"Topic: {topic}" if topic else "Topic: (cover the subject broadly)"
    system = (
        "You are an expert paper-setter for Pakistani competitive examinations. "
        "You produce exam-accurate, factually correct multiple-choice questions that match the "
        "style, difficulty, and pattern of the specified exam. You output STRICT JSON only."
    )
    user = f"""Exam: {test_type} — {exam}
Subject: {subject}
{topic_line}
Difficulty: {difficulty}
Generate exactly {count} MCQs.

Use the following retrieved syllabus/past-paper context as ground truth. Prefer facts from it.
If the context is empty or insufficient, rely on well-established knowledge — never invent facts.

=== CONTEXT START ===
{context or "(no retrieved context)"}
=== CONTEXT END ===

Rules:
- Exactly 4 options each, labelled A, B, C, D.
- Exactly one correct answer.
- Plausible distractors (no obviously wrong throwaway options).
- Include a concise factual explanation (1-3 sentences).
- Vary cognitive level for "{difficulty}" appropriately.
- For Pak Affairs / Islamic Studies / Current Affairs, ensure factual accuracy and reasonable recency.

Return ONLY a JSON array, each element:
{{
  "question": "string",
  "options": {{"A": "string", "B": "string", "C": "string", "D": "string"}},
  "answer": "A|B|C|D",
  "explanation": "string",
  "topic": "string",
  "difficulty": "easy|medium|hard"
}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def explanation_prompt(question: str, options: dict, correct: str, context: str = "") -> list[dict]:
    system = "You are a patient expert tutor for Pakistani competitive exams. Explain clearly and accurately."
    reference = f"Reference context:\n{context}\n" if context else ""
    user = f"""Question: {question}
Options: {options}
Correct answer: {correct}

{reference}
Explain WHY the correct answer is right and why each other option is wrong. Be concise and factual."""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def study_plan_prompt(*, test_type: str, subject: str, days: int, hours_per_day: int, context: str, weak_areas: list[str]) -> list[dict]:
    exam = EXAM_CONTEXT.get(test_type, EXAM_CONTEXT["OTHER"])
    system = (
        "You are an expert exam coach. You create realistic, day-by-day study plans grounded in the "
        "official syllabus. You output STRICT JSON only."
    )
    weak = ", ".join(weak_areas) if weak_areas else "none identified yet"
    user = f"""Exam: {test_type} — {exam}
Subject focus: {subject}
Total preparation window: {days} days, ~{hours_per_day} hours/day.
Known weak areas (prioritise these): {weak}

Use this syllabus context as the source of topics:
=== CONTEXT START ===
{context or "(no retrieved context)"}
=== CONTEXT END ===

Return ONLY JSON:
{{
  "summary": "string",
  "milestones": ["string", ...],
  "days": [
    {{"day": 1, "focus": "string", "topics": ["..."], "tasks": ["..."], "mcq_practice": 30}}
  ],
  "revision_strategy": "string"
}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def weak_area_prompt(performance_summary: str) -> list[dict]:
    system = "You are an exam analytics coach. Analyse performance data and give targeted, actionable advice. Output STRICT JSON only."
    user = f"""Here is a student's performance summary (per subject/topic accuracy and timing):

{performance_summary}

Return ONLY JSON:
{{
  "weak_areas": [{{"area": "string", "accuracy": 0.0, "reason": "string"}}],
  "strong_areas": ["string"],
  "recommended_topics": ["string"],
  "advice": "string"
}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def chat_system_prompt(context: str = "") -> dict:
    base = (
        "You are PrepGenius, an AI tutor for Pakistani competitive examinations "
        "(FPSC, NTS, PPSC, FGEI EST, Lecturer, PMS, CSS). You help students prepare: explain concepts, "
        "generate practice MCQs on request, build study plans, and answer subject questions accurately. "
        "Be encouraging, precise, and exam-focused. If unsure, say so rather than inventing facts."
    )
    if context:
        base += f"\n\nUse this retrieved reference material when relevant:\n=== CONTEXT ===\n{context}\n=== END ==="
    return {"role": "system", "content": base}

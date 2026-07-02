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


# ===========================================================================
# CSS Essay & Précis evaluation (grounded in FPSC standards)
# ===========================================================================
def essay_topic_prompt(theme: str | None = None) -> list[dict]:
    system = (
        "You are an FPSC CSS English Essay paper-setter. You propose authentic CSS-style essay "
        "titles: abstract, analytical, debatable statements/quotations that demand a thesis and "
        "multi-dimensional argumentation (not descriptive/factual topics). Output STRICT JSON only."
    )
    ask = f"Theme preference: {theme}" if theme else "Any contemporary/philosophical/socio-political theme."
    user = f"""Propose 6 CSS-style English Essay topics. {ask}
Mix statement-type, quotation-type, and open analytical titles similar to real CSS papers.
Return ONLY JSON: {{"topics": ["title 1", "title 2", ...]}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def essay_evaluation_prompt(*, topic: str, essay: str, word_count: int) -> list[dict]:
    system = (
        "You are a strict, experienced FPSC CSS English Essay examiner. You mark exactly to CSS "
        "standards from the official examiners' reports: an essay is judged on (1) content depth & "
        "critical argumentation from multiple angles substantiated with facts, (2) a clear thesis and "
        "logical outline actually followed in the body, (3) coherence & cohesion across paragraphs, "
        "(4) correct grammar, syntax and precise vocabulary, (5) introduction and conclusion quality. "
        "CSS marking is HARSH — most candidates score 40-55/100; only exceptional essays exceed 65. "
        "Be specific and evidence-based; quote the candidate's own text when citing mistakes. "
        "You output STRICT JSON only, matching the schema exactly."
    )
    user = f"""ESSAY TOPIC: {topic}
WORD COUNT: {word_count} (CSS expects ~2500-3000 words for a full essay)

=== CANDIDATE ESSAY START ===
{essay}
=== CANDIDATE ESSAY END ===

Evaluate to CSS standards. Be CONCISE — keep every "comment" under 12 words.
Return ONLY this JSON object (no prose outside it):
{{
  "score": 0,                       // integer out of 100, CSS-harsh
  "band": "Excellent|Good|Average|Poor",
  "word_count": {word_count},
  "readability": "one short phrase",
  "criteria": {{
    "thesis_statement": {{"score": 0, "max": 10, "comment": "short"}},
    "introduction": {{"score": 0, "max": 10, "comment": "short"}},
    "argument_strength": {{"score": 0, "max": 15, "comment": "short"}},
    "supporting_evidence": {{"score": 0, "max": 10, "comment": "short"}},
    "critical_thinking": {{"score": 0, "max": 10, "comment": "short"}},
    "coherence_cohesion": {{"score": 0, "max": 15, "comment": "short"}},
    "paragraph_organization": {{"score": 0, "max": 10, "comment": "short"}},
    "grammar": {{"score": 0, "max": 10, "comment": "short"}},
    "vocabulary_sentence": {{"score": 0, "max": 5, "comment": "short"}},
    "conclusion": {{"score": 0, "max": 5, "comment": "short"}}
  }},
  "grammar_mistakes": [{{"wrong": "quoted", "issue": "brief", "correction": "fixed"}}],  // up to 6, most important
  "spelling_mistakes": [{{"wrong": "misspelt", "correct": "correct"}}],                  // up to 6
  "repetition": ["overused word", ...],                                                   // up to 5
  "strengths": ["short point", ...],                                                      // up to 3
  "improvements": [{{"what": "brief", "why": "brief", "how": "brief", "example": "one better sentence"}}],  // exactly 3
  "verdict": "2-3 sentence examiner verdict"
}}
Criteria scores should roughly sum to the overall score. Keep the whole response tight."""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def precis_passage_prompt(theme: str | None = None) -> list[dict]:
    system = (
        "You are an FPSC CSS English (Précis & Composition) paper-setter. You produce a dense, "
        "abstract passage (~450-600 words) of the kind used for CSS précis: formal register, layered "
        "ideas, suitable for reduction to one-third. Output STRICT JSON only."
    )
    ask = f"Theme: {theme}" if theme else "Any reflective/socio-philosophical theme."
    user = f"""Write ONE CSS-style précis passage (~450-600 words). {ask}
Return ONLY JSON: {{"passage": "the full passage text", "word_count": 0}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def precis_evaluation_prompt(*, passage: str, passage_wc: int, title: str, precis: str, precis_wc: int) -> list[dict]:
    system = (
        "You are a strict FPSC CSS English (Précis) examiner. Official précis principles: the précis "
        "must (a) capture the central meaning and all essential points of the passage, omitting "
        "examples/illustrations/repetition, (b) be about ONE-THIRD of the original length, (c) be in "
        "the candidate's OWN words (no copied phrases), (d) be in the third person and past/neutral, "
        "(e) read as one connected, cohesive paragraph, (f) carry a short apt title (4-8 words, a "
        "phrase not a sentence). Marking (CSS): 15 for the précis, 5 for the title. Be specific and "
        "cite the candidate's text. Output STRICT JSON only."
    )
    ideal = max(1, round(passage_wc / 3))
    user = f"""ORIGINAL PASSAGE ({passage_wc} words):
{passage}

CANDIDATE TITLE: {title or "(none provided)"}
CANDIDATE PRÉCIS ({precis_wc} words; ideal ≈ {ideal} words, i.e. ~1/3 of {passage_wc}):
{precis or "(empty)"}

Evaluate to CSS précis standards. Return ONLY this JSON:
{{
  "score": 0,                    // out of 20 (precis 15 + title 5)
  "precis_score": 0,             // out of 15
  "title_score": 0,              // out of 5
  "band": "Excellent|Good|Average|Poor",
  "original_words": {passage_wc},
  "precis_words": {precis_wc},
  "ideal_words": {ideal},
  "length_verdict": "too long|too short|appropriate — with the actual ratio",
  "title_appropriate": true,
  "title_comment": "string",
  "captures_meaning": "string — does it capture the central idea and essential points?",
  "own_words": "string — any copied phrases? cite them",
  "third_person": true,
  "conciseness": "string",
  "clarity": "string",
  "grammar_mistakes": [{{"wrong": "quoted", "issue": "", "correction": ""}}],
  "improvements": [{{"what": "", "why": "", "how": "", "example": ""}}],
  "model_precis": "a concise model précis (~{ideal} words) demonstrating best practice",
  "verdict": "2-3 sentence overall verdict"
}}
No text outside the JSON."""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


CSS_GUIDE_SYSTEM = (
    "You are the CSS Preparation Assistant for Rahnuma/PrepGenius — an expert on Pakistan's FPSC "
    "Central Superior Services (CSS) competitive examination. Give accurate, well-structured, "
    "practical guidance on: the 6 compulsory subjects (English Essay 100, English Précis & "
    "Composition 100, General Science & Ability 100, Current Affairs 100, Pakistan Affairs 100, "
    "Islamic Studies/Comparative Religion 100 = 600) and the 6 optional subjects (600) chosen one "
    "from each of FPSC's subject groups; eligibility, the MPT screening test, essay & précis rules, "
    "examiner expectations, common mistakes, subject/optional combinations, preparation strategy, "
    "time management, paper pattern, marking (40% each compulsory, 33% each optional, 50% aggregate "
    "to qualify the written exam), and syllabus guidance. Use clear headings and bullet points. "
    "IMPORTANT: FPSC rules, syllabi, optional groups and dates change over time — always add a brief "
    "note advising candidates to verify the latest official notification at fpsc.gov.pk before relying "
    "on specifics. Never fabricate exact dates or numbers you are unsure of."
)


def chat_system_prompt(context: str = "") -> dict:
    base = (
        "You are PrepGenius, an expert AI tutor for Pakistani competitive examinations "
        "(FPSC, CSS, PMS, PPSC, NTS, FGEI EST, Lecturer). Your job is to help students prepare and "
        "pass. Give accurate, exam-oriented answers.\n\n"
        "FORMATTING — always use clean Markdown:\n"
        "- Structure answers with `##` headings and short paragraphs.\n"
        "- Use bullet points, numbered steps, and **bold** for key terms.\n"
        "- Use Markdown tables to compare/contrast, list dates, or summarise facts.\n"
        "- Use fenced code blocks for code, and standard notation for any maths.\n"
        "- End longer answers with a brief **Summary** and a **Exam tip** or mnemonic where useful.\n\n"
        "DEPTH — match the user's intent: give a concise, direct answer for quick questions, and a "
        "detailed, well-structured explanation when they ask to 'explain', 'in detail', or for exam prep. "
        "Do not pad; every line should add value.\n\n"
        "LANGUAGE — reply in the language the user uses. If they write in or ask for Urdu, respond in "
        "proper Urdu using correct Unicode script (اردو), NOT Roman Urdu. Offer a bilingual "
        "(Urdu + English) answer when it aids understanding (e.g. Urdu literature, Islamiat, Pak Affairs).\n\n"
        "SUBJECT CARE — for Islamiat, present Qur'anic verses and Ahadith respectfully and accurately, "
        "citing the reference (Surah:Ayah, or Hadith collection) and noting when a citation should be "
        "verified. For Current Affairs / Pakistan Affairs use timelines and dates; for General Knowledge "
        "and Everyday Science prefer tables and crisp facts. Include worked examples and mnemonics where "
        "they help retention.\n\n"
        "HONESTY — be encouraging but precise. If you are unsure or the fact may be outdated, say so "
        "plainly rather than inventing details."
    )
    if context:
        base += (
            "\n\nUse this retrieved reference material as ground truth when relevant, and prefer it over "
            f"prior assumptions:\n=== CONTEXT ===\n{context}\n=== END ==="
        )
    return {"role": "system", "content": base}

from models import QuestionData, ScoreResult
from core.gemini_engine import call_gemini, _gemini_client, _FLASH, _get_config

async def score_swt(q: QuestionData, text_answer: str) -> ScoreResult:
    word_count = len((text_answer or "").split())
    # Form check: must be 1 complete sentence, 5-75 words
    sentence_count = len([s for s in (text_answer or "").replace("!", ".").replace("?", ".").split(".") if s.strip()])
    form_ok = 5 <= word_count <= 75 and sentence_count <= 2

    prompt = f"""You are a PTE Core examiner scoring a "Summarize Written Text" response.

ORIGINAL PASSAGE:
\"\"\"{(q.content or '')[:800]}\"\"\"

STUDENT RESPONSE ({word_count} words):
\"\"\"{text_answer}\"\"\"

Score using the OFFICIAL PTE Core rubric. Return ONLY valid JSON — no explanation:

{{
  "content": <0–4, how many key ideas from the passage are captured: 4=5-6 main ideas, 3=3-4 ideas, 2=2 ideas, 1=1 idea, 0=off-topic>,
  "form": <0 or 1 — 1 only if it is exactly ONE complete sentence (5-75 words). If {form_ok} is False, form=0>,
  "grammar": <0–2 — 2=no errors, 1=minor errors, 0=major errors>,
  "vocabulary": <0–2 — 2=varied and precise, 1=adequate, 0=very limited or inappropriate>,
  "totalScore": <sum of content+form+grammar+vocabulary>,
  "feedback": "<2 sentences: what was done well and what to improve>"
}}"""

    result = await call_gemini(prompt, ["content", "form", "grammar", "vocabulary"])
    # Inject _max fields so frontend ScorePanel renders correct X/max per criterion
    if result.score_breakdown:
        result.score_breakdown["content_max"] = 4
        result.score_breakdown["form_max"] = 1
        result.score_breakdown["grammar_max"] = 2
        result.score_breakdown["vocabulary_max"] = 2
    return result


async def score_essay(q: QuestionData, text_answer: str) -> ScoreResult:
    word_count = len((text_answer or "").split())
    paragraphs = len([p for p in (text_answer or "").split("\n\n") if p.strip()])
    form_ok = 200 <= word_count <= 300

    prompt = f"""You are a PTE Core examiner scoring a "Write Essay" response.

ESSAY PROMPT: "{q.content}"
STUDENT ESSAY ({word_count} words, {paragraphs} paragraphs):
---
{text_answer}
---

Score using the OFFICIAL PTE Core rubric. Return ONLY valid JSON — no explanation outside the JSON:

{{
  "content": <0–6: addresses prompt with relevant ideas and supporting details. 6=fully developed, 4=mostly relevant, 2=partial, 0=off-topic>,
  "form": <0–2: word count 200-300 words. 2=within range, 1=slightly outside, 0=far outside. form_ok={form_ok}>,
  "structure": <0–6: organization, flow, logical structure. 6=excellent cohesion, 4=clear but some weak transitions, 2=basic structure, 0=incoherent>,
  "grammar": <0–2: accuracy and control. 2=rare errors, 1=some errors, 0=frequent errors>,
  "linguistic": <0–6: variety and precision of language use. 6=sophisticated varied expressions, 4=adequate range, 2=limited/simple, 0=very poor>,
  "vocabulary": <0–2: breadth and appropriateness of word choice. 2=precise and varied, 1=adequate, 0=very limited>,
  "spelling": <0–2: accuracy and consistency. 2=no errors, 1=minor errors, 0=frequent errors>,
  "totalScore": <sum of all 7 criteria, max 26>,
  "feedback": "<2-3 sentences: specific strengths and what to improve>"
}}"""

    result = await call_gemini(prompt, ["content", "form", "structure", "grammar", "linguistic", "vocabulary", "spelling"])
    if result.score_breakdown:
        result.score_breakdown["content_max"] = 6
        result.score_breakdown["form_max"] = 2
        result.score_breakdown["structure_max"] = 6
        result.score_breakdown["grammar_max"] = 2
        result.score_breakdown["linguistic_max"] = 6
        result.score_breakdown["vocabulary_max"] = 2
        result.score_breakdown["spelling_max"] = 2
    return result


async def score_sst(q: QuestionData, text_answer: str) -> ScoreResult:
    """Summarize Spoken Text — PTE Core rubric: content 0-4, form 0-2, grammar 0-2, vocabulary 0-2, spelling 0-2 = total 0-12."""
    word_count = len((text_answer or "").split())
    form_ok = 50 <= word_count <= 70

    prompt = f"""You are a PTE Core examiner scoring a "Summarize Spoken Text" response.

STUDENT SUMMARY ({word_count} words, target 50-70):
\"\"\"{text_answer}\"\"\"

Score using the OFFICIAL PTE Core rubric. Return ONLY valid JSON — no explanation:

{{
  "content": <0-4: key ideas from lecture captured. 4=all main ideas, 3=most, 2=some, 1=few, 0=off-topic>,
  "form": <0-2: word count 50-70 words. 2=within range, 1=slightly outside (40-49 or 71-80), 0=far outside. form_ok={form_ok}>,
  "grammar": <0-2: sentence structure accuracy. 2=no errors, 1=minor errors, 0=major errors>,
  "vocabulary": <0-2: word choice and range. 2=varied and precise, 1=adequate, 0=limited or inappropriate>,
  "spelling": <0-2: spelling accuracy. 2=no errors, 1=1-2 errors, 0=3+ errors>,
  "totalScore": <sum of all five, max 12>,
  "feedback": "<2 sentences: what was done well and what to improve>"
}}"""

    result = await call_gemini(prompt, ["content", "form", "grammar", "vocabulary", "spelling"])
    if result.score_breakdown:
        result.score_breakdown["content_max"] = 4
        result.score_breakdown["form_max"] = 2
        result.score_breakdown["grammar_max"] = 2
        result.score_breakdown["vocabulary_max"] = 2
        result.score_breakdown["spelling_max"] = 2
    return result


async def generate_sst_model_answer(transcript: str) -> str:
    """Tao model answer chuan cho SST tu transcript cua bai nghe."""
    prompt = f"""You are a PTE Core expert. Write a PERFECT "Summarize Spoken Text" model answer based on the transcript below.

Requirements:
- Exactly ONE complete sentence (complex sentence with multiple clauses is fine)
- Between 50 and 70 words
- Cover all main ideas from the lecture
- Use formal academic English
- No bullet points, no lists — one flowing sentence only

TRANSCRIPT:
\"\"\"{transcript[:2000]}\"\"\"

Return ONLY the model answer sentence. No explanation, no label, no extra text."""

    response = _gemini_client.models.generate_content(
        model=_FLASH, contents=prompt, config=_get_config(temperature=0.3)
    )
    return (response.text or "").strip()

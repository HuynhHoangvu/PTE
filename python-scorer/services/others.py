import json as _json
from models import QuestionData, ScoreResult
from core.gemini_engine import _gemini_client, _FLASH, _get_config

def _clamp_90(val: int) -> int:
    return max(0, min(90, val))

def score_fib(q: QuestionData, selected_answers) -> ScoreResult:
    """Fill-in-blanks — handles list or dict for both correct_answer and selected_answers."""
    raw_correct = q.correct_answer
    if isinstance(raw_correct, list):
        correct_list = [str(v).lower().strip() for v in raw_correct]
    elif isinstance(raw_correct, dict):
        correct_list = [str(v).lower().strip() for v in raw_correct.values()]
    else:
        return ScoreResult(total_score=0, score_breakdown={}, feedback="No reference answers.")

    if isinstance(selected_answers, list):
        student_list = [str(v).lower().strip() for v in selected_answers]
    elif isinstance(selected_answers, dict):
        student_list = [str(v).lower().strip() for v in selected_answers.values()]
    else:
        return ScoreResult(total_score=0, score_breakdown={}, feedback="No answers provided.")

    # If both are dicts, compare key-by-key (FIB_R: {"1":"word"} format)
    if isinstance(raw_correct, dict) and isinstance(selected_answers, dict):
        total = len(raw_correct)
        correct_count = sum(
            1 for k, v in raw_correct.items()
            if str(selected_answers.get(k, "")).lower().strip() == str(v).lower().strip()
        )
        return ScoreResult(
            total_score=correct_count,
            score_breakdown={"content": correct_count},
            feedback=f"{correct_count}/{total} blanks correct.",
        )

    total = len(correct_list)
    if total == 0:
        return ScoreResult(total_score=0, score_breakdown={}, feedback="No answers.")

    correct_count = sum(
        1 for i, val in enumerate(correct_list)
        if i < len(student_list) and student_list[i] == val
    )
    return ScoreResult(
        total_score=correct_count,
        score_breakdown={"content": correct_count},
        feedback=f"{correct_count}/{total} blanks correct.",
    )


def score_mcq_multiple(q: QuestionData, selected_answers: list) -> ScoreResult:
    """MCQ multiple: +1 for correct, -1 for incorrect."""
    correct = set(q.correct_answer or [])
    selected = set(selected_answers or [])
    score = sum(1 if s in correct else -1 for s in selected)
    max_score = len(correct)
    normalized = _clamp_90(round((max(0, score) / max(max_score, 1)) * 90))
    return ScoreResult(
        total_score=normalized,
        score_breakdown={"content": normalized},
        feedback=f"Score: {max(0, score)}/{max_score}. Correct options: {', '.join(sorted(correct))}",
    )


def score_mcq_single(q: QuestionData, selected_answer: str) -> ScoreResult:
    is_correct = str(selected_answer or "") == str(q.correct_answer or "")
    score = 90 if is_correct else 0
    return ScoreResult(
        total_score=score,
        score_breakdown={"content": score},
        feedback="Correct!" if is_correct else f"Incorrect. Answer: {q.correct_answer}",
    )


def score_reorder(q: QuestionData, ordered_labels: list) -> ScoreResult:
    """Re-order paragraphs: score by correct adjacent pairs."""
    correct: list = q.correct_answer if isinstance(q.correct_answer, list) else []
    if not correct or not ordered_labels:
        return ScoreResult(total_score=0, score_breakdown={}, feedback="No answer provided")

    total_pairs = len(correct) - 1
    correct_pairs = 0
    for i in range(len(ordered_labels) - 1):
        try:
            idx = correct.index(ordered_labels[i])
            if idx + 1 < len(correct) and correct[idx + 1] == ordered_labels[i + 1]:
                correct_pairs += 1
        except ValueError:
            pass

    total_score = _clamp_90(round((correct_pairs / max(total_pairs, 1)) * 90))
    return ScoreResult(
        total_score=total_score,
        score_breakdown={"content": total_score},
        feedback=f"{correct_pairs}/{total_pairs} correct pairs. Correct order: {' → '.join(correct)}",
    )


def score_highlight_incorrect(q: QuestionData, selected_words: list) -> ScoreResult:
    """Highlight Incorrect Words: +1 correct hit, -1 wrong hit."""
    correct = set(q.correct_answer or [])
    selected = set(selected_words or [])
    score = sum(1 if w in correct else -1 for w in selected)
    max_score = len(correct)
    normalized = _clamp_90(round((max(0, score) / max(max_score, 1)) * 90))
    return ScoreResult(
        total_score=normalized,
        score_breakdown={"content": normalized},
        feedback=f"{max(0, score)}/{max_score} incorrect words identified correctly.",
    )


def score_dictation(q: QuestionData, text_answer: str) -> ScoreResult:
    """Write from Dictation: word-by-word match against correctAnswer.transcript."""
    import re as _re

    def clean_words(text: str) -> list:
        return [_re.sub(r"[^\w]", "", w).lower() for w in text.split() if _re.sub(r"[^\w]", "", w)]

    # Extract reference from correctAnswer ({"transcript": "..."}) or fallback to content
    ca = q.correct_answer
    if isinstance(ca, dict):
        ref = ca.get("transcript") or ca.get("text") or ""
    elif isinstance(ca, str):
        ref = ca
    else:
        ref = ""
    if not ref:
        ref = q.content or q.title or ""

    ref_words = clean_words(ref)
    student_words = clean_words(text_answer or "")
    total = max(len(ref_words), 1)

    # Word frequency matching: each ref word matched at most once
    from collections import Counter
    ref_count = Counter(ref_words)
    stu_count = Counter(student_words)
    correct_count = sum(min(ref_count[w], stu_count[w]) for w in ref_count)

    total_score = _clamp_90(round((correct_count / total) * 90))
    return ScoreResult(
        total_score=total_score,
        score_breakdown={"content": total_score},
        feedback=f"{correct_count}/{total} words correct.",
    )


async def find_incorrect_words(content: str, transcript: str) -> list:
    """HIW: dung Gemini so sanh content (co tu sai) voi transcript (dung) de tim cac tu bi thay the."""
    opt_str = ""
    prompt = f"""You are helping score a PTE "Highlight Incorrect Words" question.

In this task, a TRANSCRIPTION of a lecture is shown to the student, but 5-7 words have been secretly swapped with wrong words.
The AUDIO TRANSCRIPT is what the speaker actually said (auto-transcribed by Whisper — may have minor mishearings).

TRANSCRIPTION (shown to student, contains substituted wrong words):
\"\"\"{content}\"\"\"

AUDIO TRANSCRIPT (what was actually spoken):
\"\"\"{transcript[:2000]}\"\"\"

Your task — use TWO methods to find all substituted words:

METHOD 1 — Direct comparison:
Compare the two texts word by word. Flag content words (nouns, verbs, adjectives, adverbs) that appear in the TRANSCRIPTION but differ from the AUDIO TRANSCRIPT.
Ignore: articles (a/an/the), minor punctuation gaps, filler words, number format differences (5 vs five).

METHOD 2 — Semantic plausibility check:
Even if the transcript SEEMS to agree with the transcription, check: does each content word make natural sense in context?
For example: "showed up by 2000%" sounds wrong — the natural phrase is "shot up by 2000%". Flag "showed" even if the transcript says "showed".
Apply this to verbs, adjectives, and nouns that feel oddly chosen or semantically off.

Combine both methods. Expect 5-7 substituted words total.
Return ONLY a JSON array of the substituted words exactly as they appear in the TRANSCRIPTION, no explanation.

Example output: ["presents", "money", "stimulate", "every", "huge", "showed"]"""

    response = _gemini_client.models.generate_content(
        model=_FLASH, contents=prompt, config=_get_config(temperature=0.1)
    )
    text = (response.text or "").strip()
    start, end = text.find("["), text.rfind("]") + 1
    if start >= 0 and end > start:
        return _json.loads(text[start:end])
    return []


async def pick_smw_answer(transcript: str, content: str, options: list) -> str:
    """SMW: dung Gemini chon option hoan chinh lecture hop ly nhat."""
    opt_str = "\n".join(f"{o['label']}. {o['text']}" for o in options)
    prompt = f"""You are a PTE exam expert. In "Select Missing Word", a lecture audio ends with a beep replacing the last word or phrase. The student must choose which option correctly completes the lecture.

LECTURE TRANSCRIPT (transcribed from audio — the final word/phrase is missing, replaced by a beep):
\"\"\"{transcript[:1500]}\"\"\"

OPTIONS to complete the lecture:
{opt_str}

Rules:
- Based on the topic and flow of the lecture, choose which option LOGICALLY completes the final idea
- Distractors often reuse words already mentioned in the lecture — the correct answer usually introduces the conclusion
- Return ONLY the letter label (A, B, C, D, E, or F), nothing else"""

    response = _gemini_client.models.generate_content(
        model=_FLASH, contents=prompt, config=_get_config(temperature=0.1)
    )
    import re as _re
    text = (response.text or "").strip().upper()
    match = _re.search(r'\b([A-F])\b', text)
    return match.group(1) if match else text[:1]

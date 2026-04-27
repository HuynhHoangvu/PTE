import json as _json
import os
import re as _re
import difflib
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


def _hiw_word_tokens(text: str):
    """(normalized_key, original_token) for each whitespace token — key dung de so sanh."""
    out = []
    for raw in (text or "").split():
        orig = raw.strip()
        if not orig:
            continue
        key = _re.sub(r"[^\w]", "", orig.lower())
        if not key:
            continue
        out.append((key, orig))
    return out


def find_incorrect_words_diff(content: str, transcript: str) -> list:
    """
    HIW: can bang tu Whisper (transcript) voi van ban hien thi (content).
    Token nao tren content nam trong cum 'replace' / 'insert' so voi transcript thi la tu sai can highlight.
    """
    b_toks = _hiw_word_tokens(content)
    a_toks = _hiw_word_tokens(transcript or "")
    if not b_toks:
        return []
    if not a_toks:
        return []

    a_keys = [t[0] for t in a_toks]
    b_keys = [t[0] for t in b_toks]
    b_orig = [t[1] for t in b_toks]

    sm = difflib.SequenceMatcher(a=a_keys, b=b_keys, autojunk=False)
    out = []
    for tag, _i1, _i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("replace", "insert"):
            out.extend(b_orig[j1:j2])
    return out


async def _find_incorrect_words_gemini(content: str, transcript: str) -> list:
    """Fallback: Gemini so sanh content vs transcript."""
    prompt = f"""You are helping build the answer key for a PTE Academic "Highlight Incorrect Words" (HIW) task.

The student sees a TRANSCRIPTION on screen. A few words in it were replaced so they do NOT match what the speaker said.
The AUDIO TRANSCRIPT below is an automatic transcription (Whisper) of the recording — it can have small errors, homophones, or missing punctuation.

TRANSCRIPTION (shown on screen — may contain deliberate wrong words; copy spellings from here for your answer list):
\"\"\"{content}\"\"\"

AUDIO TRANSCRIPT (what was spoken, per Whisper):
\"\"\"{transcript[:2000]}\"\"\"

Rules (precision over recall):
- Walk the passage in order. Flag a word (or short phrase as printed on screen, e.g. "one hundred") ONLY when the TRANSCRIPTION clearly disagrees with the AUDIO TRANSCRIPT at that spot (substitution), not when Whisper likely mis-heard the same intended word.
- Do NOT pad the list to any target length. Real items may have only 2–4 wrong words, or more — return exactly what clearly mismatches, nothing extra.
- Do NOT use "semantic plausibility" to invent errors: if both strings align for that token, do not flag it.
- Return ONLY a JSON array of strings — each string must match the on-screen word/phrase exactly as it appears in the TRANSCRIPTION. No markdown, no explanation.

Example output: ["west", "east"]"""

    response = _gemini_client.models.generate_content(
        model=_FLASH, contents=prompt, config=_get_config(temperature=0.1)
    )
    text = (response.text or "").strip()
    start, end = text.find("["), text.rfind("]") + 1
    if start >= 0 and end > start:
        return _json.loads(text[start:end])
    return []


async def find_incorrect_words(content: str, transcript: str) -> list:
    """
    HIW: mac dinh can bang tu (Whisper vs content) bang difflib.
    - HIW_FIND_WORDS_USE_GEMINI=1: chi dung Gemini (hanh vi cu).
    - HIW_FIND_WORDS_DIFF_ONLY=1: chi diff, khong goi Gemini (ke ca khi diff rong).
    - Mac dinh: co ket qua diff thi tra diff; diff rong thi thu Gemini (neu co key).
    """
    force_gemini = os.getenv("HIW_FIND_WORDS_USE_GEMINI", "").strip().lower() in ("1", "true", "yes")
    diff_only = os.getenv("HIW_FIND_WORDS_DIFF_ONLY", "").strip().lower() in ("1", "true", "yes")

    diff_words = find_incorrect_words_diff(content, transcript or "")

    if force_gemini:
        return await _find_incorrect_words_gemini(content, transcript or "")

    if diff_words:
        return diff_words

    if diff_only:
        return diff_words

    try:
        return await _find_incorrect_words_gemini(content, transcript or "")
    except Exception:
        return diff_words


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

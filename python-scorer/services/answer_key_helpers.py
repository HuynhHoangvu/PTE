import json as _json
import os
import re as _re
import difflib
from core.gemini_engine import _gemini_client, _FLASH, _get_config

# Note: MCQ/FIB/reorder/highlight/dictation are scored deterministically on the
# backend (NestJS) directly — those question types never reach python-scorer's
# /score endpoint (see backend/src/questions/deterministic-types.ts), so no
# duplicate scoring functions live here. This module only holds the
# answer-key-authoring helpers below, used by one-off admin backfill scripts.


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


def _hiw_flat_word_diff_tokens(content: str, transcript: str) -> list:
    """Diff toàn bài theo từ (difflib) — baseline."""
    b_toks = _hiw_word_tokens(content)
    a_toks = _hiw_word_tokens(transcript or "")
    if not b_toks or not a_toks:
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


def _hiw_split_sentences(text: str) -> list:
    """Tách câu đơn giản — giữ khớp đoạn dài không có dấu chấm trong một sentence."""
    if not (text or "").strip():
        return []
    parts = _re.split(r"(?<=[.!?])\s+|\n{2,}", text.strip())
    return [p.strip() for p in parts if p.strip()]


def find_incorrect_words_diff_sentence(content: str, transcript: str) -> list:
    """
    Căn chỉnh theo câu trước, rồi diff từng cặp — giảm trôi alignment khi Whisper lệch đoạn dài.
    """
    sa = _hiw_split_sentences(transcript or "")
    sb = _hiw_split_sentences(content or "")
    if len(sb) < 2 and len(sa) < 2:
        return []
    if not sa:
        return []

    sm = difflib.SequenceMatcher(a=sa, b=sb, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                out.extend(_hiw_flat_word_diff_tokens(sb[j1 + k], sa[i1 + k]))
        elif tag == "replace":
            chunk_a = " ".join(sa[i1:i2])
            chunk_b = " ".join(sb[j1:j2])
            out.extend(_hiw_flat_word_diff_tokens(chunk_b, chunk_a))
        elif tag == "insert":
            chunk_b = " ".join(sb[j1:j2])
            out.extend([t[1] for t in _hiw_word_tokens(chunk_b)])
    return out


def _merge_word_surfaces_in_content_order(content: str, lists: list) -> list:
    """Gộp các list từ sai, bỏ trùng (chuẩn hoá key), giữ thứ tự xuất hiện trong content."""
    seen = set()
    ordered = []
    for lst in lists:
        for w in lst:
            key = _re.sub(r"[^\w]", "", w.lower())
            if key and key not in seen:
                seen.add(key)
                ordered.append(w)
    # Ưu tiên thứ tự xuất hiện trên passage (content)
    flat_order = [t[1] for t in _hiw_word_tokens(content)]
    pos = {w: i for i, w in enumerate(flat_order)}
    ordered.sort(key=lambda w: pos.get(w, 9999))
    return ordered


def find_incorrect_words_diff(content: str, transcript: str) -> list:
    """
    HIW: so Whisper vs transcript hiển thị.
    Kết hợp diff phẳng + diff theo câu (merge), ít lệch alignment hơn chỉ một pass.
    """
    flat = _hiw_flat_word_diff_tokens(content, transcript or "")
    sent = find_incorrect_words_diff_sentence(content, transcript or "")
    if not sent:
        return flat
    if not flat:
        return sent
    return _merge_word_surfaces_in_content_order(content, [sent, flat])


async def _find_incorrect_words_gemini(content: str, transcript: str) -> list:
    """Fallback: Gemini so sanh content vs transcript."""
    prompt = f"""You are helping build the answer key for a PTE Academic "Highlight Incorrect Words" (HIW) task.

The student sees a TRANSCRIPTION on screen. A few words in it were replaced so they do NOT match what the speaker said.
The AUDIO TRANSCRIPT below is an automatic transcription (Whisper) of the recording — it can have small errors, homophones, missing punctuation, or clause order shifts vs the printed text.

TRANSCRIPTION (shown on screen — may contain deliberate wrong words; copy spellings EXACTLY from here for each answer):
\"\"\"{content}\"\"\"

AUDIO TRANSCRIPT (what was spoken, per Whisper):
\"\"\"{transcript[:2000]}\"\"\"

Rules (precision over recall):
- Walk the passage in READING ORDER. Compare meaning/sounds at each slot; Whisper may drift — prefer substitution mismatches (wrong printed word vs what audio suggests) over random Whisper noise.
- Flag a word or short phrase AS PRINTED only when it clearly does NOT match what was spoken at that position (substitution). Do NOT flag when Whisper simply spelled the same word differently but it matches the audio intent.
- Homophones: if the printed word matches what was likely said, do NOT flag.
- Do NOT pad the list to any target length.
- Return ONLY a JSON array of strings — each string must match the on-screen token exactly (same capitalization/spacing as single tokens in TRANSCRIPTION). No markdown, no explanation.

Example output: ["west", "east"]"""

    response = _gemini_client.models.generate_content(
        model=_FLASH, contents=prompt, config=_get_config(temperature=0.1)
    )
    text = (response.text or "").strip()
    start, end = text.find("["), text.rfind("]") + 1
    if start >= 0 and end > start:
        return _json.loads(text[start:end])
    return []


async def find_incorrect_words(content: str, transcript: str, strategy: str = "auto") -> list:
    """
    HIW answer-key generation (content = transcript shown; transcript = Whisper).

    strategy:
      - auto: merged sentence+flat diff; neu trong env bat Gemini hoac diff rong thi Gemini (tru diff_only).
      - gemini / gemini_only: chi Gemini.
      - diff / merged: merged diff (mac dinh tot cho passage dai).
      - flat / sentence: chi mot kieu diff.

    Env:
      HIW_FIND_WORDS_USE_GEMINI=1 — ep Gemini (auto path).
      HIW_FIND_WORDS_DIFF_ONLY=1 — khong goi Gemini.
    """
    s = (strategy or "auto").strip().lower()
    force_gemini = os.getenv("HIW_FIND_WORDS_USE_GEMINI", "").strip().lower() in ("1", "true", "yes")
    diff_only = os.getenv("HIW_FIND_WORDS_DIFF_ONLY", "").strip().lower() in ("1", "true", "yes")

    if s in ("gemini", "gemini_only"):
        try:
            return await _find_incorrect_words_gemini(content, transcript or "")
        except Exception:
            return []

    if s == "flat":
        return _hiw_flat_word_diff_tokens(content, transcript or "")

    if s == "sentence":
        return find_incorrect_words_diff_sentence(content, transcript or "")

    if s in ("diff", "merged"):
        return find_incorrect_words_diff(content, transcript or "")

    diff_words = find_incorrect_words_diff(content, transcript or "")

    if force_gemini:
        try:
            return await _find_incorrect_words_gemini(content, transcript or "")
        except Exception:
            return diff_words

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

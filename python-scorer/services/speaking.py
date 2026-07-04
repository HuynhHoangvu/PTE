import os
import jiwer
import numpy as np
import tempfile
import base64
from typing import Optional
from core.utils import logger, _clean_text, _normalize_audio_to_wav, _clean_base64_audio
from core.whisper_engine import get_whisper_model
from models import QuestionData, ScoreResult, QuestionType, PronunciationAssessmentResult
import librosa

# Voice activity detection (used for the "no speech at all" pre-check in main.py)
try:
    from core.acoustic_features import detect_voice_activity
    PHASE2_AVAILABLE = True
except ImportError:
    PHASE2_AVAILABLE = False


# ── Internal Scoring Helpers ─────────────────────────────────────────────────

def _repeat_sentence_reference_text(q: QuestionData) -> str:
    if isinstance(q.correct_answer, str) and q.correct_answer.strip():
        return q.correct_answer.strip()
    if q.suggested_answer and str(q.suggested_answer).strip():
        return str(q.suggested_answer).strip()
    return ""


def _compute_word_alignment_read_aloud(ref_words: list, hyp_words: list) -> dict:
    """
    Compute word alignment with two metrics:
    1. Presence-based: Check if reference words appear anywhere in hypothesis (lenient)
    2. Sequential: Check order-aware matching using SequenceMatcher (strict for penalties)

    Returns dict with both metrics for flexibility in scoring.
    """
    from difflib import SequenceMatcher

    # 1. PRESENCE-BASED COVERAGE (lenient - any position)
    hyp_words_set = set(hyp_words)
    present_count = sum(1 for w in ref_words if w in hyp_words_set)
    presence_coverage = (present_count / len(ref_words) * 100) if ref_words else 0

    # 2. SEQUENTIAL COVERAGE (strict - order matters)
    matcher = SequenceMatcher(None, ref_words, hyp_words, autojunk=False)
    matching_blocks = matcher.get_matching_blocks()

    correct_ref_indices = set()
    for block in matching_blocks:
        for i in range(block.size):
            correct_ref_indices.add(block.a + i)

    sequential_count = len(correct_ref_indices)
    sequential_coverage = (sequential_count / len(ref_words) * 100) if ref_words else 0

    # Precision: how many of spoken words were correct
    correct_spoken = sum(m.size for m in matching_blocks)
    precision = (correct_spoken / len(hyp_words) * 100) if hyp_words else 0

    return {
        "presence_coverage": presence_coverage,  # Lenient: any position
        "sequential_coverage": sequential_coverage,  # Strict: order matters
        "presence_count": present_count,
        "sequential_count": sequential_count,
        "ref_total": len(ref_words),
        "precision": precision,
        "correct_ref_indices": list(correct_ref_indices),
        "matching_blocks": matching_blocks
    }


def _score_content_read_aloud(ref_words: list, hyp_words: list) -> tuple:
    """
    PTE-oriented content scoring for Read Aloud:
    - Primary: lexical coverage (words from prompt that were spoken, regardless of slight reorder)
    - Secondary: sequence quality (penalize heavy disorder but avoid cascade penalty)
    """
    alignment = _compute_word_alignment_read_aloud(ref_words, hyp_words)
    presence = alignment["presence_coverage"]
    sequential = alignment["sequential_coverage"]

    # Blend favors content coverage, then applies mild order sensitivity.
    # This prevents one local mismatch from turning a long tail into all-red.
    coverage = (0.75 * presence) + (0.25 * sequential)

    # Extra penalty only when order collapses badly vs spoken coverage.
    if presence >= 70 and sequential < 45:
        coverage -= 8
    elif presence >= 55 and sequential < 35:
        coverage -= 5
    coverage = max(0.0, min(100.0, coverage))

    if coverage >= 95:   return 5, coverage
    elif coverage >= 80: return 4, coverage
    elif coverage >= 60: return 3, coverage
    elif coverage >= 40: return 2, coverage
    elif coverage >= 20: return 1, coverage
    else:                return 0, coverage


def _score_pronunciation_read_aloud(ref_words: list, hyp_words: list, avg_logprob: float = -0.5) -> tuple:
    """
    Score pronunciation based on:
    1. How many words were spoken CORRECTLY (exact match) - PRIMARY
    2. How clearly they were spoken (Whisper confidence) - SECONDARY
    """
    alignment = _compute_word_alignment_read_aloud(ref_words, hyp_words)
    sequential_coverage = alignment["sequential_coverage"]
    precision = alignment["precision"]
    
    whisper_score = max(0.0, min(100.0, (avg_logprob + 1.0) * 100.0))
    combined = 0.7 * sequential_coverage + 0.3 * whisper_score
    
    if combined >= 80:   return 5, precision
    elif combined >= 65: return 4, precision
    elif combined >= 50: return 3, precision
    elif combined >= 35: return 2, precision
    elif combined >= 20: return 1, precision
    else:                return 0, precision


def _score_pronunciation_pte(accuracy: float) -> int:
    good_pct = accuracy * 100
    if good_pct >= 70:   return 5
    elif good_pct >= 50: return 4
    elif good_pct >= 30: return 3
    elif good_pct >= 20: return 2
    elif good_pct >= 10: return 1
    else:                return 0


def _score_pronunciation_describe_image(avg_logprob: float) -> int:
    """
    Linear Pronunciation scoring for Describe Image.
    Maps avg_logprob from [-1.5, -0.5] → [0, 5]
    - avg_logprob = -0.5 → 5/5 (very clear)
    - avg_logprob = -1.0 → 2.5/5 (medium)
    - avg_logprob = -1.5 → 0/5 (unintelligible)
    """
    score = (avg_logprob + 1.5) * 5
    return int(round(max(0, min(5, score))))


def _score_fluency_pte(wpm: float, hesitation_count: int = 0) -> int:
    base_score = 0
    if 130 <= wpm <= 170:  base_score = 5
    elif 110 <= wpm < 130: base_score = 4
    elif 80 <= wpm < 110:  base_score = 3
    elif 60 <= wpm < 80:   base_score = 2
    elif 0 < wpm < 60:     base_score = 1
    elif wpm > 170:        base_score = 4 # Speaking very fast is still fluent, just slightly unnatural pace
    final_score = max(0, base_score - (hesitation_count // 2))
    return int(final_score)


def _estimate_wpm(transcription: str, duration: float) -> float:
    if duration <= 0: return 0
    words = transcription.split()
    return (len(words) / duration) * 60


def _score_content_repeat_sentence(accuracy_pct: float) -> int:
    if accuracy_pct >= 100: return 3
    elif accuracy_pct >= 50: return 2
    elif accuracy_pct > 0: return 1
    else: return 0


def _speaking_breakdown(content: int, pronunciation: int, fluency: int, content_max: int = 5) -> dict:
    return {
        "content": content,
        "content_max": content_max,
        "pronunciation": pronunciation,
        "pronunciation_max": 5,
        "fluency": fluency,
        "fluency_max": 5,
    }


def _score_fluency_repeat_sentence(wpm: float, hesitation_count: int = 0, audio_buffer: Optional[bytes] = None) -> int:
    score = 5.0
    if 130 <= wpm <= 170: score = 5.0
    elif wpm < 80: score = 2.0
    elif 80 <= wpm < 130: score = 3.5
    elif 170 < wpm <= 200: score = 4.0
    else: score = 2.0
    score -= min(hesitation_count * 0.5, 2.0)
    return max(0, round(score))


def _detect_hallucination(transcription: str, avg_logprob: float = -0.5) -> dict:
    """
    Phát hiện ảo giác (Hallucination) của Whisper.
    
    Trả về dict:
    {
        "is_hallucinating": bool,
        "confidence": 0-100,  # độ chắc chắn là ảo giác
        "reasons": list,      # lý do phát hiện
        "severity": "none" | "low" | "medium" | "high"
    }
    """
    # Chỉ dựa vào 2 tín hiệu thật có thể tin cậy được:
    # (1) ký tự non-ASCII lẫn vào — audio PTE luôn là tiếng Anh, nên chữ Hán/Nhật/emoji
    #     xuất hiện gần như chắc chắn là Whisper "bịa" ra khi không nghe rõ.
    # (2) avg_logprob — độ tự tin của chính Whisper khi decode; thấp bất thường
    #     nghĩa là model cũng không chắc mình nghe đúng.
    # (Đã bỏ danh sách từ khóa/whitelist từ vựng cứng vì đó là đoán mò, không phải tín hiệu thật.)
    reasons = []
    confidence = 0

    non_ascii_count = sum(1 for c in transcription if ord(c) > 127)
    if non_ascii_count > 0:
        reasons.append(f"Non-ASCII characters detected: {non_ascii_count}")
        confidence += 40

    if avg_logprob < -1.0:
        reasons.append(f"Very low Whisper confidence (avg_logprob={avg_logprob:.2f})")
        confidence += 35
    elif avg_logprob < -0.8:
        reasons.append(f"Low Whisper confidence (avg_logprob={avg_logprob:.2f})")
        confidence += 15

    # Xác định mức độ severity
    is_hallucinating = confidence > 45
    if confidence >= 75:
        severity = "high"
    elif confidence >= 55:
        severity = "medium"
    elif confidence > 45:
        severity = "low"
    else:
        severity = "none"
    
    return {
        "is_hallucinating": is_hallucinating,
        "confidence": min(100, confidence),
        "reasons": reasons,
        "severity": severity,
        "non_ascii_count": non_ascii_count,
        "avg_logprob": avg_logprob
    }


def _extract_keywords(text: str) -> set:
    stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is", "are", "it"}
    words = _clean_text(text).split()
    keywords = set()
    for w in words:
        if len(w) > 2 and w not in stop_words:
            keywords.add(w)
    return keywords


def _count_mid_speech_pauses(audio_buffer: bytes, sr: int = 16000, pause_threshold_sec: float = 2.0) -> int:
    """
    Đếm số khoảng dừng ≥ pause_threshold_sec xảy ra GIỮA lúc đang nói
    (loại bỏ khoảng im lặng cuối bài — chỉ phạt nếu dừng giữa chừng).
    """
    try:
        if not audio_buffer:
            return 0
        audio_data = np.frombuffer(audio_buffer, dtype=np.float32)
        hop_length = 512
        energy = librosa.feature.rms(y=audio_data, frame_length=2048, hop_length=hop_length)[0]
        threshold = 0.1 * np.max(energy) if np.max(energy) > 0 else 1e-6
        vad = (energy > threshold).astype(int)

        # Cắt trailing silence: tìm frame cuối cùng có giọng nói
        last_voice = len(vad) - 1
        while last_voice > 0 and vad[last_voice] == 0:
            last_voice -= 1
        vad_trimmed = vad[:last_voice + 1]

        pause_frames_threshold = int(pause_threshold_sec * sr / hop_length)
        pause_count = 0
        current_pause = 0

        for is_voice in vad_trimmed:
            if is_voice == 0:
                current_pause += 1
            else:
                if current_pause >= pause_frames_threshold:
                    pause_count += 1
                current_pause = 0

        return pause_count
    except Exception as e:
        logger.warning(f"Failed to count mid-speech pauses: {e}")
        return 0


def _apply_pause_penalty(fluency_score: int, audio_buffer: Optional[bytes]) -> int:
    """Trừ điểm fluency theo số lần dừng ≥2s giữa câu, dùng chung cho mọi loại câu hỏi speaking."""
    if not audio_buffer:
        return fluency_score
    pause_count = _count_mid_speech_pauses(audio_buffer, pause_threshold_sec=2.0)
    if pause_count > 0:
        fluency_score = max(0, fluency_score - pause_count)
    return fluency_score


async def _transcribe_with_meta(audio_base64: str, mime_type: str, initial_prompt: str = None, use_beam: bool = False) -> dict:
    try:
        audio_b64_clean = _clean_base64_audio(audio_base64)
        audio_data = base64.b64decode(audio_b64_clean)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_input:
            tmp_input.write(audio_data)
            tmp_input_path = tmp_input.name
        tmp_wav_path = tmp_input_path + ".wav"
        if not _normalize_audio_to_wav(tmp_input_path, tmp_wav_path):
            tmp_wav_path = tmp_input_path
        try:
            import torch
            model = get_whisper_model()
            
            # Optimize transcription: beam=5 for Read Aloud (long passage, accuracy matters),
            # beam=1 (greedy) for everything else (speed)
            transcribe_options = {
                "language": "en",
                "verbose": False,
                "word_timestamps": True,
                "beam_size": 5 if use_beam else 1,
                "best_of": 1,         # No sampling diversity (default is 1)
                "temperature": 0,     # Deterministic; reduces hallucination on short audio
                "no_speech_threshold": 0.6,  # Suppress hallucination when no speech detected
                "fp16": torch.cuda.is_available()  # Use FP16 on GPU for speed
            }

            # initial_prompt giúp Whisper nhận dạng chính xác hơn
            # với audio ngắn (ASQ: 1-3 từ) bằng cách cho trước context
            if initial_prompt:
                transcribe_options["initial_prompt"] = initial_prompt

            result = model.transcribe(tmp_wav_path, **transcribe_options)
            trans_text = result["text"].strip()
            segments = result.get("segments", [])
            dur = sum(s["end"] - s["start"] for s in segments) if segments else 0
            avg_logprob = np.mean([s.get("avg_logprob", -0.5) for s in segments]) if segments else -0.5
            # no_speech_prob cao → Whisper không chắc có lời nói (nguy cơ hallucination)
            no_speech_prob = np.mean([s.get("no_speech_prob", 0.0) for s in segments]) if segments else 1.0
            return {
                "text": trans_text,
                "avg_logprob": float(avg_logprob),
                "speech_duration": dur,
                "no_speech_prob": float(no_speech_prob),
            }
        finally:
            for p in [tmp_input_path, tmp_wav_path]:
                try: os.unlink(p)
                except: pass
    except:
        return {"text": "", "avg_logprob": -1.0, "speech_duration": 0, "no_speech_prob": 1.0}


# ── Public Scoring Functions ─────────────────────────────────────────────────

async def score_read_aloud(q: QuestionData, transcription: str, duration: float, audio_buffer: Optional[bytes] = None, avg_logprob: float = -0.5, speech_duration: float = 0.0) -> ScoreResult:
    if not transcription:
        return ScoreResult(total_score=0, score_breakdown=_speaking_breakdown(0, 0, 0), feedback="❌ No speech detected.", transcription="")

    clean_ref = _clean_text(q.content or "")
    clean_rec = _clean_text(transcription)
    ref_words, hyp_words = clean_ref.split(), clean_rec.split()

    content_score, content_pct = _score_content_read_aloud(ref_words, hyp_words)
    pronunciation_score, _ = _score_pronunciation_read_aloud(ref_words, hyp_words, avg_logprob)

    wpm = _estimate_wpm(transcription, duration)
    fluency_score = _score_fluency_pte(wpm)

    # Cap fluency by coverage: người đọc được bao nhiêu % đoạn text thì
    # điểm fluency không được vượt quá mức tương ứng.
    # Tránh trường hợp đọc 1 câu nhanh → WPM cao → full fluency.
    alignment = _compute_word_alignment_read_aloud(ref_words, hyp_words)
    coverage_pct = alignment["sequential_coverage"]   # 0–100
    if coverage_pct >= 80:   max_fluency = 5
    elif coverage_pct >= 60: max_fluency = 4
    elif coverage_pct >= 40: max_fluency = 3
    elif coverage_pct >= 20: max_fluency = 2
    else:                    max_fluency = 1
    fluency_score = min(fluency_score, max_fluency)

    
    fluency_score = _apply_pause_penalty(fluency_score, audio_buffer)

    total_score = content_score + pronunciation_score + fluency_score
    breakdown = _speaking_breakdown(content_score, pronunciation_score, fluency_score)

    return ScoreResult(total_score=total_score, score_breakdown=breakdown, transcription=transcription)


async def score_repeat_sentence(q: QuestionData, transcription: str, duration: float, audio_buffer: Optional[bytes] = None, avg_logprob: float = -0.5) -> ScoreResult:
    if not transcription:
        return ScoreResult(total_score=0, score_breakdown=_speaking_breakdown(0, 0, 0, content_max=3), feedback="❌ No speech detected.", transcription="")

    ref_text = _repeat_sentence_reference_text(q)
    clean_ref = _clean_text(ref_text)
    clean_rec = _clean_text(transcription)
    
    wer = jiwer.wer(clean_ref, clean_rec)
    content_score = _score_content_repeat_sentence(max(0, (1 - wer) * 100))

    # Pronunciation proxy: Whisper's own decoding confidence (avg_logprob).
    # There is no real phoneme-level pronunciation model here — this is an
    # honest best-effort signal, not a claim of PTE-grade acoustic scoring.
    pronunciation_score = _score_pronunciation_pte(avg_logprob + 1.0)

    wpm = _estimate_wpm(transcription, duration)
    fluency_score = _score_fluency_repeat_sentence(wpm)

    fluency_score = _apply_pause_penalty(fluency_score, audio_buffer)

    total_score = content_score + pronunciation_score + fluency_score
    return ScoreResult(total_score=total_score, score_breakdown=_speaking_breakdown(content_score, pronunciation_score, fluency_score, content_max=3), transcription=transcription)


async def score_speaking_extended(q: QuestionData, transcription: str, qtype: QuestionType, duration: float, audio_buffer: Optional[bytes] = None, avg_logprob: float = -0.5) -> ScoreResult:
    if not transcription:
        return ScoreResult(total_score=0, score_breakdown=_speaking_breakdown(0, 0, 0), feedback="❌ No speech detected.", transcription="")
    
    ref_source = q.correct_answer or q.suggested_answer or q.content or q.title or ""
    
    if isinstance(ref_source, (list, tuple)):
        ref_source = " ".join(map(str, ref_source))
    elif isinstance(ref_source, dict):
        ref_source = " ".join(map(str, ref_source.values()))
    
    # ────────────────────────────────────────────────────────────────────
    # RETELL LECTURE: Dùng WER (Word Error Rate) - strict scoring
    # Vì có suggestedAnswer từ Whisper transcript của audio gốc
    # ────────────────────────────────────────────────────────────────────
    if qtype.name == "SPEAKING_RETELL_LECTURE":
        clean_ref = _clean_text(str(ref_source))
        clean_rec = _clean_text(transcription)
        
        # Content score: dùng WER (như Repeat Sentence)
        wer = jiwer.wer(clean_ref, clean_rec)
        content_accuracy = max(0, (1 - wer) * 100)
        
        if content_accuracy >= 100: content_score = 5
        elif content_accuracy >= 80: content_score = 4
        elif content_accuracy >= 60: content_score = 3
        elif content_accuracy >= 40: content_score = 2
        elif content_accuracy > 0: content_score = 1
        else: content_score = 0
        
        wpm = _estimate_wpm(transcription, duration)
        fluency_score = _score_fluency_pte(wpm)
        pronunciation_score = _score_pronunciation_describe_image(avg_logprob)
        
        fluency_score = _apply_pause_penalty(fluency_score, audio_buffer)

        total = content_score + fluency_score + pronunciation_score
        return ScoreResult(
            total_score=total,
            score_breakdown=_speaking_breakdown(content_score, pronunciation_score, fluency_score),
            transcription=transcription
        )

    # ────────────────────────────────────────────────────────────────────
    # DESCRIBE IMAGE, RESPOND TO SITUATION, etc: Dùng keyword matching (lenient)
    # ────────────────────────────────────────────────────────────────────
    ref_kw = _extract_keywords(str(ref_source))
    hyp_kw = _extract_keywords(transcription)
    
    matched_keywords = ref_kw.intersection(hyp_kw)
    
    if not ref_kw:
        content_score = 3
    else:
        matched_pct = (len(matched_keywords) / len(ref_kw)) * 100
        if matched_pct >= 20: content_score = 5
        elif matched_pct >= 15: content_score = 4
        elif matched_pct >= 10: content_score = 3
        elif matched_pct >= 5: content_score = 2
        elif matched_pct > 0: content_score = 1
        else: content_score = 0
    
    wpm = _estimate_wpm(transcription, duration)
    fluency_score = _score_fluency_pte(wpm)
    pronunciation_score = _score_pronunciation_describe_image(avg_logprob)

    # ⚠️ CROSS-SCORING PENALTY: Phát hiện ảo giác (Hallucination)
    hallucination_info = _detect_hallucination(transcription, avg_logprob)
    
    # Nếu phát hiện ảo giác MẠNH và Pronunciation = 0, thì cap Content score
    if hallucination_info["is_hallucinating"] and pronunciation_score == 0 and hallucination_info["severity"] in ["high", "medium"]:
        original_content = content_score
        content_score = min(1, content_score)
        reasons = "; ".join(hallucination_info["reasons"][:2])
        logger.warning(f"Hallucination warning: {hallucination_info['severity']} severity ({reasons}). Content reduced from {original_content} to {content_score}")

    fluency_score = _apply_pause_penalty(fluency_score, audio_buffer)

    total = content_score + fluency_score + pronunciation_score
    return ScoreResult(
        total_score=total,
        score_breakdown=_speaking_breakdown(content_score, pronunciation_score, fluency_score),
        transcription=transcription
    )


async def score_summarise_group_discussion(q: QuestionData, transcription: str, duration: float, audio_buffer: Optional[bytes] = None, avg_logprob: float = -0.5) -> ScoreResult:
    if not transcription:
        return ScoreResult(total_score=0, score_breakdown=_speaking_breakdown(0, 0, 0), feedback="❌ No speech detected.", transcription="")

    # Content: keyword overlap với suggestedAnswer (bản tóm tắt mẫu)
    # Không dùng content (transcript gốc) vì quá dài và nhiễu keyword
    ref_source = q.suggested_answer or q.correct_answer or ""
    if isinstance(ref_source, (list, tuple)):
        ref_source = " ".join(map(str, ref_source))
    ref_kw = _extract_keywords(str(ref_source))
    hyp_kw = _extract_keywords(transcription)
    matched = ref_kw.intersection(hyp_kw)

    if not ref_kw:
        content_score = 3
    else:
        pct = (len(matched) / len(ref_kw)) * 100
        # Ngưỡng lenient: chỉ cần đề cập đủ ý chính
        if pct >= 30:   content_score = 5
        elif pct >= 20: content_score = 4
        elif pct >= 12: content_score = 3
        elif pct >= 5:  content_score = 2
        elif pct > 0:   content_score = 1
        else:           content_score = 0

    # Fluency: dựa trên số từ nói được (target ~150 từ trong 75s)
    # Không dùng WPM vì SGD cần nói đủ ý, không cần tốc độ nhanh
    word_count = len(transcription.split())
    if word_count >= 140:   fluency_score = 5
    elif word_count >= 110: fluency_score = 4
    elif word_count >= 80:  fluency_score = 3
    elif word_count >= 50:  fluency_score = 2
    else:                   fluency_score = 1

    # Pronunciation
    pronunciation_score = _score_pronunciation_describe_image(avg_logprob)

    fluency_score = _apply_pause_penalty(fluency_score, audio_buffer)

    total = content_score + fluency_score + pronunciation_score
    return ScoreResult(
        total_score=total,
        score_breakdown=_speaking_breakdown(content_score, pronunciation_score, fluency_score),
        transcription=transcription,
    )


async def score_answer_short_question(q: QuestionData, transcription: str, avg_logprob: float = -0.5, no_speech_prob: float = 0.0) -> ScoreResult:
    # Reject transcription khi Whisper không tin tưởng (hallucination trên audio ngắn 1-3s)
    if no_speech_prob > 0.6 or avg_logprob < -1.0:
        return ScoreResult(
            total_score=0,
            score_breakdown={"content": 0},
            feedback="Could not recognise speech clearly. Please speak louder or closer to the microphone.",
            transcription=transcription
        )
    clean_user = _clean_text(transcription)

    # correct_answer có thể là:
    #   - array ["back", "the back", "back of book"]  (sau backfill)
    #   - string "astronomer"                          (seed data cũ)
    raw = q.correct_answer
    if isinstance(raw, (list, tuple)):
        accepted = [_clean_text(str(a)) for a in raw if str(a).strip()]
    elif isinstance(raw, str) and raw.strip():
        accepted = [_clean_text(raw)]
    else:
        # Không có đáp án → không thể chấm chính xác, cho 0
        return ScoreResult(
            total_score=0,
            score_breakdown={"content": 0},
            feedback="No reference answer available.",
            transcription=transcription
        )

    # Khớp nếu user nói ra một cụm nằm trong bất kỳ đáp án chấp nhận được
    # VD: user nói "the back of the book" → "back" nằm trong đó → đúng
    score = 0
    matched = ""
    for ans in accepted:
        if not ans:
            continue
        # ans chứa trong lời user, HOẶC lời user chứa trong ans
        if ans in clean_user or clean_user in ans:
            score = 1
            matched = ans
            break

    feedback = f"Correct (matched: '{matched}')" if score else f"Incorrect (expected one of: {', '.join(accepted[:3])})"
    return ScoreResult(
        total_score=score,
        score_breakdown={"content": score},
        feedback=feedback,
        transcription=transcription
    )


async def assess_pronunciation_from_audio(reference_text: str, audio_base64: str, audio_mime: str, language: str = "en") -> PronunciationAssessmentResult:
    meta = await _transcribe_with_meta(audio_base64, audio_mime)
    trans_raw = meta["text"]
    clean_ref = _clean_text(reference_text)
    clean_rec = _clean_text(trans_raw)
    wer = jiwer.wer(clean_ref, clean_rec)
    score = max(0, (1 - wer) * 100)
    return PronunciationAssessmentResult(total_score=score, wer=wer, reference_text=clean_ref, transcribed_text=clean_rec, transcribe_raw=trans_raw, feedback="Assessment complete.")
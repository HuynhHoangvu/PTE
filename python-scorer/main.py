from pathlib import Path
from dotenv import load_dotenv

# Luôn đọc python-scorer/.env (không phụ thuộc cwd). override=True: thắng biến GEMINI_* cũ trong Windows.
_SCORER_ROOT = Path(__file__).resolve().parent
load_dotenv(_SCORER_ROOT / ".env", override=True)

import os
import base64
from typing import Optional
import tempfile
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from models import (
    QuestionType, ScoreRequest, ScoreResult,
    PronunciationAssessmentRequest, PronunciationAssessmentResult,
    TranscribeRequest
)
from core.utils import logger, _load_audio_as_float32, _clean_base64_audio
from core.whisper_engine import get_whisper_model
from services.speaking import (
    score_read_aloud, score_repeat_sentence, score_speaking_extended,
    score_summarise_group_discussion, score_answer_short_question,
    assess_pronunciation_from_audio, _speaking_breakdown, _transcribe_with_meta,
    PHASE2_AVAILABLE, detect_voice_activity
)
from services.writing import score_swt, score_essay, score_sst, generate_sst_model_answer
from services.answer_key_helpers import find_incorrect_words, pick_smw_answer

app = FastAPI(
    title="FlyEdu PTE AI Scorer",
    description="Python backend for PTE scoring",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "FlyEdu PTE AI Scorer",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "phase2_available": PHASE2_AVAILABLE,
        "whisper_model": os.getenv("WHISPER_MODEL", "small")
    }

@app.get("/health")
async def health():
    return {"status": "ok"}



# ── Stage 1: decode audio + reject silence before spending a Whisper call ──────
def _decode_and_check_audio(req: ScoreRequest, qtype: QuestionType) -> tuple:
    """Returns (audio_buffer, early_reject). early_reject is a ScoreResult if the
    audio contains no speech at all (speaking types only); otherwise None."""
    if not req.audio_base64:
        return None, None

    try:
        audio_bytes = base64.b64decode(_clean_base64_audio(req.audio_base64))
        ext = {"audio/wav": ".wav", "audio/mp3": ".mp3"}.get(req.audio_mime, ".webm")
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            audio_data = _load_audio_as_float32(tmp_path, target_sr=16000)
            audio_buffer = audio_data.tobytes()
            if PHASE2_AVAILABLE and qtype.startswith("SPEAKING_"):
                vad_result = detect_voice_activity(audio_data, sr=16000, threshold_db=-55.0, min_duration_ms=200)
                if not vad_result.get("has_speech", False):
                    early_reject = ScoreResult(
                        total_score=0,
                        score_breakdown=_speaking_breakdown(
                            0, 0, 0,
                            content_max=3 if qtype == QuestionType.SPEAKING_REPEAT_SENTENCE else 5,
                        ),
                        feedback="❌ No speech detected. Please try again.",
                        transcription=""
                    )
                    return audio_buffer, early_reject
            return audio_buffer, None
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"Audio pre-processing warning: {e}")
        return None, None


# ── Stage 2: transcribe (speaking types only) ─────────────────────────────────
def _whisper_prompt_for(qtype: QuestionType, q) -> Optional[str]:
    """Context hint fed to Whisper as initial_prompt — improves accuracy on short/tricky audio."""
    if qtype == QuestionType.SPEAKING_READ_ALOUD and q.content:
        return str(q.content).strip()
    if qtype == QuestionType.SPEAKING_REPEAT_SENTENCE:
        ref = q.correct_answer or q.suggested_answer
        return str(ref).strip() if ref else None
    if qtype == QuestionType.SPEAKING_ANSWER_SHORT_QUESTION and q.correct_answer:
        raw = q.correct_answer
        if isinstance(raw, (list, tuple)):
            hints = [str(a) for a in raw if str(a).strip()]
        elif isinstance(raw, str) and raw.strip():
            hints = [raw.strip()]
        else:
            hints = []
        return ("PTE Answer Short Question. Expected answer: " + ", ".join(hints) + ".") if hints else None
    return None


async def _transcribe_if_speaking(req: ScoreRequest, qtype: QuestionType) -> tuple:
    """Returns (transcription, trans_meta). No-op (empty) for non-speaking types."""
    if not (req.audio_base64 and qtype.startswith("SPEAKING_")):
        return "", {"avg_logprob": -0.5, "speech_duration": 0.0}

    trans_meta = await _transcribe_with_meta(
        req.audio_base64, req.audio_mime or "audio/webm",
        initial_prompt=_whisper_prompt_for(qtype, req.question),
        use_beam=qtype == QuestionType.SPEAKING_READ_ALOUD,
    )
    return trans_meta["text"], trans_meta


# ── Stage 3: dispatch to the right scorer ─────────────────────────────────────
async def _score_speaking(qtype, q, transcription, audio_buffer, trans_meta, req):
    if qtype == QuestionType.SPEAKING_READ_ALOUD:
        return await score_read_aloud(q, transcription, req.duration_seconds or 40, audio_buffer, trans_meta["avg_logprob"], trans_meta["speech_duration"])
    if qtype == QuestionType.SPEAKING_REPEAT_SENTENCE:
        return await score_repeat_sentence(q, transcription, req.duration_seconds or 15, audio_buffer, trans_meta["avg_logprob"])
    if qtype == QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION:
        return await score_summarise_group_discussion(q, transcription, req.duration_seconds or 75, audio_buffer, trans_meta.get("avg_logprob", -0.5))
    if qtype in (QuestionType.SPEAKING_DESCRIBE_IMAGE, QuestionType.SPEAKING_RETELL_LECTURE, QuestionType.SPEAKING_RESPOND_TO_SITUATION):
        return await score_speaking_extended(q, transcription, qtype, req.duration_seconds or 40, audio_buffer, trans_meta.get("avg_logprob", -0.5))
    if qtype == QuestionType.SPEAKING_ANSWER_SHORT_QUESTION:
        return await score_answer_short_question(q, transcription, avg_logprob=trans_meta.get("avg_logprob", -0.5), no_speech_prob=trans_meta.get("no_speech_prob", 0.0))
    return None


# Writing / SST take a text answer only — no audio involved, so a flat map is enough.
_TEXT_ANSWER_SCORERS = {
    QuestionType.WRITING_SUMMARIZE_WRITTEN_TEXT: score_swt,
    QuestionType.WRITING_ESSAY: score_essay,
    QuestionType.LISTENING_SUMMARIZE_SPOKEN_TEXT: score_sst,
}


async def score_attempt(req: ScoreRequest) -> ScoreResult:
    q = req.question
    qtype = req.question_type

    audio_buffer, early_reject = _decode_and_check_audio(req, qtype)
    if early_reject:
        return early_reject

    transcription, trans_meta = await _transcribe_if_speaking(req, qtype)

    speaking_result = await _score_speaking(qtype, q, transcription, audio_buffer, trans_meta, req)
    if speaking_result is not None:
        return speaking_result

    text_scorer = _TEXT_ANSWER_SCORERS.get(qtype)
    if text_scorer:
        return await text_scorer(q, req.text_answer or "")

    # MCQ / FIB / reorder / highlight-incorrect-word / dictation are scored
    # deterministically on the backend (NestJS) directly and never reach this
    # endpoint — see backend/src/questions/deterministic-types.ts.
    raise HTTPException(status_code=400, detail=f"Unsupported question type: {qtype}")


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.post("/score", response_model=ScoreResult)
async def api_score(req: ScoreRequest):
    return await score_attempt(req)

@app.post("/pronunciation-assessment/upload", response_model=PronunciationAssessmentResult)
async def api_pronunciation(req: PronunciationAssessmentRequest):
    return await assess_pronunciation_from_audio(req.reference_text, req.audio_base64, req.audio_mime, req.language)

@app.post("/transcribe", response_model=dict)
async def api_transcribe(req: TranscribeRequest):
    return await _transcribe_with_meta(req.audio_base64, req.audio_mime)


class FindIncorrectWordsRequest(BaseModel):
    content: str
    transcript: str
    strategy: Optional[str] = "auto"

@app.post("/find-incorrect-words", response_model=dict)
async def api_find_incorrect_words(req: FindIncorrectWordsRequest):
    try:
        words = await find_incorrect_words(req.content, req.transcript, req.strategy or "auto")
        return {"incorrect_words": words}
    except Exception as e:
        logger.error(f"find-incorrect-words error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GenerateKeywordsRequest(BaseModel):
    transcript: str

@app.post("/generate-keywords", response_model=dict)
async def api_generate_keywords(req: GenerateKeywordsRequest):
    try:
        answer = await generate_sst_model_answer(req.transcript)
        if not answer:
            raise HTTPException(status_code=422, detail="Empty response from Gemini")
        return {"keywords": answer}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate-keywords error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SmwAnswerRequest(BaseModel):
    transcript: str
    content: str
    options: list

@app.post("/smw-answer", response_model=dict)
async def api_smw_answer(req: SmwAnswerRequest):
    try:
        answer = await pick_smw_answer(req.transcript, req.content, req.options)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"smw-answer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

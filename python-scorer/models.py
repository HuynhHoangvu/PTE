from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel

# ── Enums ────────────────────────────────────────────────────────────────────
class QuestionType(str, Enum):
    # Speaking
    SPEAKING_READ_ALOUD = "SPEAKING_READ_ALOUD"
    SPEAKING_REPEAT_SENTENCE = "SPEAKING_REPEAT_SENTENCE"
    SPEAKING_DESCRIBE_IMAGE = "SPEAKING_DESCRIBE_IMAGE"
    SPEAKING_RETELL_LECTURE = "SPEAKING_RETELL_LECTURE"
    SPEAKING_ANSWER_SHORT_QUESTION = "SPEAKING_ANSWER_SHORT_QUESTION"
    SPEAKING_SUMMARISE_GROUP_DISCUSSION = "SPEAKING_SUMMARISE_GROUP_DISCUSSION"
    SPEAKING_RESPOND_TO_SITUATION = "SPEAKING_RESPOND_TO_SITUATION"
    # Writing
    WRITING_SUMMARIZE_WRITTEN_TEXT = "WRITING_SUMMARIZE_WRITTEN_TEXT"
    WRITING_ESSAY = "WRITING_ESSAY"
    # Reading
    READING_FIB_R_W = "READING_FIB_R_W"
    READING_MCQ_MULTIPLE_ANSWER = "READING_MCQ_MULTIPLE_ANSWER"
    READING_RE_ORDER_PARAGRAPH = "READING_RE_ORDER_PARAGRAPH"
    READING_FIB_R = "READING_FIB_R"
    READING_MCQ_SINGLE_ANSWER = "READING_MCQ_SINGLE_ANSWER"
    # Listening
    LISTENING_SUMMARIZE_SPOKEN_TEXT = "LISTENING_SUMMARIZE_SPOKEN_TEXT"
    LISTENING_MCQ_MULTIPLE_ANSWER = "LISTENING_MCQ_MULTIPLE_ANSWER"
    LISTENING_FIB_L = "LISTENING_FIB_L"
    LISTENING_HIGHLIGHT_CORRECT_SUMMARY = "LISTENING_HIGHLIGHT_CORRECT_SUMMARY"
    LISTENING_MCQ_SINGLE_ANSWER = "LISTENING_MCQ_SINGLE_ANSWER"
    LISTENING_SELECT_MISSING_WORD = "LISTENING_SELECT_MISSING_WORD"
    LISTENING_HIGHLIGHT_INCORRECT_WORD = "LISTENING_HIGHLIGHT_INCORRECT_WORD"
    LISTENING_DICTATION = "LISTENING_DICTATION"


# ── Schemas ──────────────────────────────────────────────────────────────────
class QuestionData(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    correct_answer: Optional[Any] = None   # str | list | dict
    suggested_answer: Optional[str] = None  # RS: transcript / sample
    options: Optional[Any] = None          # list[{label, text}] | list[{text, isBlank}]
    response_time: Optional[int] = None
    prep_time: Optional[int] = None


class ScoreRequest(BaseModel):
    question_type: QuestionType
    question: QuestionData
    text_answer: Optional[str] = None       # essay, SWT, dictation, SST
    selected_answers: Optional[Any] = None  # str | list[str] | dict[str,str]
    audio_base64: Optional[str] = None      # base64 webm audio
    audio_mime: Optional[str] = "audio/webm"
    duration_seconds: Optional[float] = None  # Actual duration in seconds


class ScoreResult(BaseModel):
    total_score: int
    score_breakdown: dict
    feedback: str = ""
    transcription: Optional[str] = None


class TranscribeRequest(BaseModel):
    audio_base64: str
    audio_mime: str = "audio/webm"


class PronunciationAssessmentRequest(BaseModel):
    """Yêu cầu đánh giá phát âm (Giai đoạn 1)"""
    reference_text: str          # Văn bản gốc cần so sánh
    audio_base64: str            # Audio base64 (webm, mp3, wav)
    audio_mime: str = "audio/webm"
    language: str = "en"         # Ngôn ngữ: en, vi, etc.


class PronunciationAssessmentResult(BaseModel):
    """Kết quả đánh giá phát âm"""
    total_score: float           # 0-100
    wer: float                   # Word Error Rate (0-1)
    reference_text: str          # Text gốc (đã làm sạch)
    transcribed_text: str        # Tiếng đọc được (đã làm sạch)
    transcribe_raw: str          # Text từ Whisper (chưa làm sạch)
    feedback: str                # Nhận xét chi tiết
    status: str = "success"

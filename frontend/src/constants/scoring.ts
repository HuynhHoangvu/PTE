/**
 * Single source of truth for PTE practice scoring and display.
 * Thang điểm báo cáo PTE Academic là 10–90 (overall); *trên từng câu* app dùng thang rubric
 * theo dạng bài — không gộp nhầm “điểm toàn kỳ thi” với “điểm một task”.
 *
 * ── Bảng tham chiếu rubric (luật chấm một task trong app — đối chiếu Pearson PTS materials) ──
 *
 * SPEAKING
 *   Read Aloud                 max 15  (content 5 + pronunciation 5 + oral fluency 5)
 *   Repeat Sentence            max 13  (content 3 + pronunciation 5 + oral fluency 5)
 *   Describe Image / Retell / Summarize group / Respond to situation  max 15 mỗi dạng
 *   Answer Short Question      max 1
 *
 * WRITING
 *   Summarize Written Text     max 9   (content 4 + form 1 + grammar 2 + vocab 2)
 *   Write Essay                max 26
 *
 * LISTENING
 *   Summarize Spoken Text      max 12
 *   Write from Dictation       max = số từ trong transcript (mỗi từ đúng = 1; luyện tập theo từ, không dùng 0–90)
 *   Còn lại (MCQ, FIB, RO, HIW, …)  tính theo số ô/số lựa chọn đúng trên từng câu (UI dùng max riêng từng màn)
 *
 * READING
 *   FIB / MCQ / RO            max theo từng câu (blanks, options, pairs)
 *
 * Các dạng “xác định” (đáp án cố định) vẫn nằm trong DETERMINISTIC_TYPES; thang lưu DB có thể
 * khác từng dạng — WFD dùng thang từ, không còn scale 0–90.
 */

import type { Question } from '../types';

// Max tổng *một câu* theo dạng (cố định), dùng cho chuẩn hoá & UI khi max không phụ thuộc nội dung câu
export const MAX_SCORE_BY_TYPE: Record<string, number> = {
  SPEAKING_READ_ALOUD: 15,
  SPEAKING_REPEAT_SENTENCE: 13,
  SPEAKING_DESCRIBE_IMAGE: 15,
  SPEAKING_RETELL_LECTURE: 15,
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: 15,
  SPEAKING_RESPOND_TO_SITUATION: 15,
  SPEAKING_ANSWER_SHORT_QUESTION: 1,
  WRITING_SUMMARIZE_WRITTEN_TEXT: 9,
  WRITING_ESSAY: 26,
  LISTENING_SUMMARIZE_SPOKEN_TEXT: 12,
};

export const DETERMINISTIC_TYPES = new Set([
  'READING_MCQ_MULTIPLE_ANSWER',
  'LISTENING_MCQ_MULTIPLE_ANSWER',
  'READING_MCQ_SINGLE_ANSWER',
  'LISTENING_MCQ_SINGLE_ANSWER',
  'LISTENING_HIGHLIGHT_CORRECT_SUMMARY',
  'LISTENING_SELECT_MISSING_WORD',
  'READING_RE_ORDER_PARAGRAPH',
  'LISTENING_HIGHLIGHT_INCORRECT_WORD',
  'READING_FIB_R_W',
  'READING_FIB_R',
  'LISTENING_FIB_L',
  'LISTENING_DICTATION',
]);

/** Đếm từ đáp án chuẩn cho Write from Dictation (khớp logic backend). */
export function countDictationReferenceWords(q: Pick<Question, 'correctAnswer' | 'content' | 'title'>): number {
  const ca = q.correctAnswer as { transcript?: string } | string | undefined | null;
  let ref = '';
  if (ca && typeof ca === 'object' && 'transcript' in ca && ca.transcript) ref = String(ca.transcript);
  else if (typeof ca === 'string') ref = ca;
  if (!ref) ref = q.content || q.title || '';
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  return Math.max(clean(ref).length, 1);
}

/**
 * Max điểm hiển thị khi làm bài: WFD = số từ transcript; các dạng khác = MAX_SCORE_BY_TYPE hoặc 90 (fallback).
 */
export function getPracticeDisplayMax(question: Pick<Question, 'type' | 'correctAnswer' | 'content' | 'title'>): number {
  if (question.type === 'LISTENING_DICTATION') {
    return countDictationReferenceWords(question);
  }
  return getMaxScore(question.type);
}

export function normalizeScore(raw: number | null | undefined, max: number): number {
  if (raw == null || isNaN(raw)) return 0;
  const v = Math.round(raw);
  if (v <= max) return Math.max(0, v);
  if (v <= max * 2) return max;
  return Math.min(max, Math.round((v / 100) * max));
}

/** Get maxScore for a question type (falls back to 90 for unknown types — không dùng cho WFD, xem getPracticeDisplayMax). */
export function getMaxScore(questionType: string): number {
  return MAX_SCORE_BY_TYPE[questionType] ?? 90;
}

export function normalizeHistoryScore(
  raw: number | null | undefined,
  questionType: string,
): number | undefined {
  if (raw == null) return undefined;
  if (DETERMINISTIC_TYPES.has(questionType)) return undefined;
  return normalizeScore(raw, getMaxScore(questionType));
}

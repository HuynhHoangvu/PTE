/**
 * Single source of truth for PTE scoring configuration.
 * All scoring display logic imports from here — never hardcode maxScore elsewhere.
 */

// Max total score per question type (used for display and normalization)
export const MAX_SCORE_BY_TYPE: Record<string, number> = {
  SPEAKING_READ_ALOUD: 15,              // content(5) + pronunciation(5) + fluency(5)
  SPEAKING_REPEAT_SENTENCE: 13,         // content(3) + pronunciation(5) + fluency(5)
  SPEAKING_DESCRIBE_IMAGE: 15,
  SPEAKING_RETELL_LECTURE: 15,
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: 15,
  SPEAKING_RESPOND_TO_SITUATION: 15,
  SPEAKING_ANSWER_SHORT_QUESTION: 1,
  WRITING_SUMMARIZE_WRITTEN_TEXT: 9,    // content(4) + form(1) + grammar(2) + vocabulary(2)
  WRITING_ESSAY: 26,                    // content(6)+form(2)+structure(6)+grammar(2)+linguistic(6)+vocab(2)+spelling(2)
  LISTENING_SUMMARIZE_SPOKEN_TEXT: 12,  // content(4)+form(2)+grammar(2)+vocab(2)+spelling(2)
};

// Types whose scores are computed deterministically (0-90 internal scale, not shown in AI panel)
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

/**
 * Normalize a raw score value into [0, max].
 *
 * Three cases:
 *  1. rawVal <= max             → clamp directly (most common — AI returned correct scale)
 *  2. max < rawVal <= max * 2   → slight overshoot, just cap at max
 *  3. rawVal > max * 2          → assume 0-100 scale, scale down proportionally
 *
 * This avoids the previous bug where rawVal=6 with max=5 was treated as 0-100 scale
 * and converted to Math.round((6/100)*5) = 0 instead of the correct value of 5.
 */
export function normalizeScore(raw: number | null | undefined, max: number): number {
  if (raw == null || isNaN(raw)) return 0;
  const v = Math.round(raw);
  if (v <= max) return Math.max(0, v);
  if (v <= max * 2) return max;                                    // slight overshoot
  return Math.min(max, Math.round((v / 100) * max));              // 0-100 scale
}

/** Get maxScore for a question type (falls back to 90 for deterministic/unknown types). */
export function getMaxScore(questionType: string): number {
  return MAX_SCORE_BY_TYPE[questionType] ?? 90;
}

/** Normalize a historical attempt totalScore for display in AnalysisTable. */
export function normalizeHistoryScore(
  raw: number | null | undefined,
  questionType: string,
): number | undefined {
  if (raw == null) return undefined;
  if (DETERMINISTIC_TYPES.has(questionType)) return undefined; // not shown
  return normalizeScore(raw, getMaxScore(questionType));
}

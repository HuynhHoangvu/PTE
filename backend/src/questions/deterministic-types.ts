import { QuestionType } from './question.entity';

/** Question types scored locally (no AI / Python). Kept in one place to avoid drift. */
export const DETERMINISTIC_QUESTION_TYPES = new Set<QuestionType>([
  QuestionType.READING_MCQ_MULTIPLE_ANSWER,
  QuestionType.LISTENING_MCQ_MULTIPLE_ANSWER,
  QuestionType.READING_MCQ_SINGLE_ANSWER,
  QuestionType.LISTENING_MCQ_SINGLE_ANSWER,
  QuestionType.LISTENING_HIGHLIGHT_CORRECT_SUMMARY,
  QuestionType.LISTENING_SELECT_MISSING_WORD,
  QuestionType.READING_RE_ORDER_PARAGRAPH,
  QuestionType.LISTENING_HIGHLIGHT_INCORRECT_WORD,
  QuestionType.READING_FIB_R_W,
  QuestionType.READING_FIB_R,
  QuestionType.LISTENING_FIB_L,
  QuestionType.LISTENING_DICTATION,
]);

export function isDeterministicQuestionType(type: QuestionType): boolean {
  return DETERMINISTIC_QUESTION_TYPES.has(type);
}

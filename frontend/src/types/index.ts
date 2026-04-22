export type QuestionSkill = 'SPEAKING' | 'WRITING' | 'READING' | 'LISTENING';

export type QuestionType =
  | 'SPEAKING_READ_ALOUD' | 'SPEAKING_REPEAT_SENTENCE' | 'SPEAKING_DESCRIBE_IMAGE'
  | 'SPEAKING_RETELL_LECTURE' | 'SPEAKING_ANSWER_SHORT_QUESTION'
  | 'SPEAKING_SUMMARISE_GROUP_DISCUSSION' | 'SPEAKING_RESPOND_TO_SITUATION'
  | 'WRITING_SUMMARIZE_WRITTEN_TEXT' | 'WRITING_ESSAY'
  | 'READING_FIB_R_W' | 'READING_MCQ_MULTIPLE_ANSWER' | 'READING_RE_ORDER_PARAGRAPH'
  | 'READING_FIB_R' | 'READING_MCQ_SINGLE_ANSWER'
  | 'LISTENING_SUMMARIZE_SPOKEN_TEXT' | 'LISTENING_MCQ_MULTIPLE_ANSWER'
  | 'LISTENING_FIB_L' | 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY'
  | 'LISTENING_MCQ_SINGLE_ANSWER' | 'LISTENING_SELECT_MISSING_WORD'
  | 'LISTENING_HIGHLIGHT_INCORRECT_WORD' | 'LISTENING_DICTATION';

export interface Question {
  id: string;
  code: string;
  skill: QuestionSkill;
  type: QuestionType;
  title?: string;
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  options?: any;
  correctAnswer?: any;
  suggestedAnswer?: string;
  tips?: string;
  level: 'Easy' | 'Medium' | 'Hard';
  isTrending: boolean;
  isRepeated: boolean;
  prepTime: number;
  responseTime: number;
  minWords?: number;
  maxWords?: number;
  userScore?: number;
}

export interface Attempt {
  id: string;
  questionId: string;
  userId: string;
  audioUrl?: string;
  textAnswer?: string;
  selectedAnswers?: any;
  totalScore?: number;
  scoreBreakdown?: Record<string, number>;
  feedback?: string;
  transcription?: string;
  status: 'PENDING' | 'SCORING' | 'SCORED' | 'ERROR';
  duration?: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'premium';
  role?: 'admin' | 'user';
  avatarUrl?: string;
  streakDays: number;
  totalAttempts: number;
  averageScore: number;
  lastActiveAt?: string;
}

export interface MockTest {
  id: string;
  code: string;
  title: string;
  description?: string;
  sections: { speaking: string[]; writing: string[]; reading: string[]; listening: string[] };
  durationMinutes: number;
  updatedYear?: string;
}

export interface MockTestAttempt {
  id: string;
  mockTestId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  currentQuestionIndex: number;
  totalScore?: number;
  sectionScores?: { speaking: number; writing: number; reading: number; listening: number };
  timeRemainingSeconds?: number;
  startedAt?: string;
  completedAt?: string;
}

// Label maps
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SPEAKING_READ_ALOUD: 'Read Aloud',
  SPEAKING_REPEAT_SENTENCE: 'Repeat Sentence',
  SPEAKING_DESCRIBE_IMAGE: 'Describe Image',
  SPEAKING_RETELL_LECTURE: 'Retell Lecture',
  SPEAKING_ANSWER_SHORT_QUESTION: 'Answer Short Question',
  SPEAKING_SUMMARISE_GROUP_DISCUSSION: 'Summarize Group Discussion',
  SPEAKING_RESPOND_TO_SITUATION: 'Respond to a Situation',
  WRITING_SUMMARIZE_WRITTEN_TEXT: 'Summarize Written Text',
  WRITING_ESSAY: 'Write Essay',
  READING_FIB_R_W: 'R&W: Fill in the Blanks',
  READING_MCQ_MULTIPLE_ANSWER: 'MC, Choose Multiple Answers',
  READING_RE_ORDER_PARAGRAPH: 'Re-order Paragraphs',
  READING_FIB_R: 'Fill in the Blanks (Reading)',
  READING_MCQ_SINGLE_ANSWER: 'MC, Choose Single Answer',
  LISTENING_SUMMARIZE_SPOKEN_TEXT: 'Summarize Spoken Text',
  LISTENING_MCQ_MULTIPLE_ANSWER: 'MC, Choose Multiple Answers',
  LISTENING_FIB_L: 'Fill in the Blanks (Listening)',
  LISTENING_HIGHLIGHT_CORRECT_SUMMARY: 'Highlight Correct Summary',
  LISTENING_MCQ_SINGLE_ANSWER: 'MC, Choose Single Answer',
  LISTENING_SELECT_MISSING_WORD: 'Select Missing Words',
  LISTENING_HIGHLIGHT_INCORRECT_WORD: 'Highlight Incorrect Words',
  LISTENING_DICTATION: 'Write from Dictation',
};

export const SKILL_TYPES: Record<QuestionSkill, QuestionType[]> = {
  SPEAKING: [
    'SPEAKING_READ_ALOUD','SPEAKING_REPEAT_SENTENCE','SPEAKING_DESCRIBE_IMAGE',
    'SPEAKING_RETELL_LECTURE','SPEAKING_ANSWER_SHORT_QUESTION',
    'SPEAKING_SUMMARISE_GROUP_DISCUSSION','SPEAKING_RESPOND_TO_SITUATION',
  ],
  WRITING: ['WRITING_SUMMARIZE_WRITTEN_TEXT','WRITING_ESSAY'],
  READING: [
    'READING_FIB_R_W','READING_MCQ_MULTIPLE_ANSWER','READING_RE_ORDER_PARAGRAPH',
    'READING_FIB_R','READING_MCQ_SINGLE_ANSWER',
  ],
  LISTENING: [
    'LISTENING_SUMMARIZE_SPOKEN_TEXT','LISTENING_MCQ_MULTIPLE_ANSWER','LISTENING_FIB_L',
    'LISTENING_HIGHLIGHT_CORRECT_SUMMARY','LISTENING_MCQ_SINGLE_ANSWER',
    'LISTENING_SELECT_MISSING_WORD','LISTENING_HIGHLIGHT_INCORRECT_WORD','LISTENING_DICTATION',
  ],
};

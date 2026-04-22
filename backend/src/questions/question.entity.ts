import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Attempt } from '../attempts/attempt.entity';

export enum QuestionSkill {
  SPEAKING = 'SPEAKING',
  WRITING = 'WRITING',
  READING = 'READING',
  LISTENING = 'LISTENING',
}

export enum QuestionType {
  // Speaking
  SPEAKING_READ_ALOUD = 'SPEAKING_READ_ALOUD',
  SPEAKING_REPEAT_SENTENCE = 'SPEAKING_REPEAT_SENTENCE',
  SPEAKING_DESCRIBE_IMAGE = 'SPEAKING_DESCRIBE_IMAGE',
  SPEAKING_RETELL_LECTURE = 'SPEAKING_RETELL_LECTURE',
  SPEAKING_ANSWER_SHORT_QUESTION = 'SPEAKING_ANSWER_SHORT_QUESTION',
  SPEAKING_SUMMARISE_GROUP_DISCUSSION = 'SPEAKING_SUMMARISE_GROUP_DISCUSSION',
  SPEAKING_RESPOND_TO_SITUATION = 'SPEAKING_RESPOND_TO_SITUATION',
  // Writing
  WRITING_SUMMARIZE_WRITTEN_TEXT = 'WRITING_SUMMARIZE_WRITTEN_TEXT',
  WRITING_ESSAY = 'WRITING_ESSAY',
  // Reading
  READING_FIB_R_W = 'READING_FIB_R_W',
  READING_MCQ_MULTIPLE_ANSWER = 'READING_MCQ_MULTIPLE_ANSWER',
  READING_RE_ORDER_PARAGRAPH = 'READING_RE_ORDER_PARAGRAPH',
  READING_FIB_R = 'READING_FIB_R',
  READING_MCQ_SINGLE_ANSWER = 'READING_MCQ_SINGLE_ANSWER',
  // Listening
  LISTENING_SUMMARIZE_SPOKEN_TEXT = 'LISTENING_SUMMARIZE_SPOKEN_TEXT',
  LISTENING_MCQ_MULTIPLE_ANSWER = 'LISTENING_MCQ_MULTIPLE_ANSWER',
  LISTENING_FIB_L = 'LISTENING_FIB_L',
  LISTENING_HIGHLIGHT_CORRECT_SUMMARY = 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY',
  LISTENING_MCQ_SINGLE_ANSWER = 'LISTENING_MCQ_SINGLE_ANSWER',
  LISTENING_SELECT_MISSING_WORD = 'LISTENING_SELECT_MISSING_WORD',
  LISTENING_HIGHLIGHT_INCORRECT_WORD = 'LISTENING_HIGHLIGHT_INCORRECT_WORD',
  LISTENING_DICTATION = 'LISTENING_DICTATION',
}

export enum QuestionLevel {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. RA0002, RS0001, DI0003

  @Column({ type: 'enum', enum: QuestionSkill })
  skill: QuestionSkill;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ nullable: true })
  title: string;

  // Text content (Read Aloud, SWT, Essay topic, MC passage, etc.)
  @Column({ type: 'text', nullable: true })
  content: string;

  // Audio file URL (for Listening & speaking with audio)
  @Column({ nullable: true })
  audioUrl: string;

  // Image URL (Describe Image)
  @Column({ nullable: true })
  imageUrl: string;

  // For FIB: JSON array of {text, isBlank, options:[]} segments
  // For MC: JSON array of {label, text} choices
  // For Re-order: JSON array of {label, text} paragraphs
  // For FIB-L: JSON array of blank positions
  @Column({ type: 'jsonb', nullable: true })
  options: any;

  // Correct answer(s): string | string[] | object
  @Column({ type: 'jsonb', nullable: true })
  correctAnswer: any;

  // Suggested answer / sample answer text
  @Column({ type: 'text', nullable: true })
  suggestedAnswer: string;

  // Tips & strategies
  @Column({ type: 'text', nullable: true })
  tips: string;

  @Column({ type: 'enum', enum: QuestionLevel, default: QuestionLevel.MEDIUM })
  level: QuestionLevel;

  @Column({ default: false })
  isTrending: boolean;

  @Column({ default: false })
  isRepeated: boolean;

  // Timer in seconds (preparation time)
  @Column({ default: 0 })
  prepTime: number;

  // Response time in seconds
  @Column({ default: 40 })
  responseTime: number;

  // Word limits for writing tasks
  @Column({ nullable: true })
  minWords: number;

  @Column({ nullable: true })
  maxWords: number;

  @Column({ default: 0 })
  attemptCount: number;

  @OneToMany(() => Attempt, (a) => a.question)
  attempts: Attempt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

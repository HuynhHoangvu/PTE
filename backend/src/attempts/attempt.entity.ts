import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Question } from '../questions/question.entity';

export enum AttemptStatus {
  PENDING = 'PENDING',
  SCORING = 'SCORING',
  SCORED = 'SCORED',
  ERROR = 'ERROR',
}

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.attempts, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Question, (q) => q.attempts, { onDelete: 'CASCADE' })
  @JoinColumn()
  question: Question;

  @Column()
  questionId: string;

  // For speaking: audio file URL (uploaded)
  @Column({ nullable: true })
  audioUrl: string;

  // For speaking: audio file binary data (stored in DB)
  @Column({ type: 'bytea', nullable: true })
  audioData: Buffer;

  // For writing: text answer
  @Column({ type: 'text', nullable: true })
  textAnswer: string;

  // For MC/FIB: selected answers as JSON
  @Column({ type: 'jsonb', nullable: true })
  selectedAnswers: any;

  // AI Scoring results
  @Column({ type: 'float', nullable: true })
  totalScore: number;

  @Column({ type: 'jsonb', nullable: true })
  scoreBreakdown: {
    pronunciation?: number;
    fluency?: number;
    content?: number;
    grammar?: number;
    vocabulary?: number;
    spelling?: number;
    form?: number;
    development?: number;
  };

  // AI feedback text
  @Column({ type: 'text', nullable: true })
  feedback: string;

  // AI Tutor enriched data
  @Column({ type: 'text', nullable: true })
  tutorTip: string;

  @Column({ type: 'jsonb', nullable: true })
  wordErrors: { word: string; issue: string; tip: string }[];

  @Column({ type: 'jsonb', nullable: true })
  vocabSuggestions: { original: string; better: string; reason: string }[];

  // Transcription from Whisper (speaking tasks)
  @Column({ type: 'text', nullable: true })
  transcription: string;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.PENDING })
  status: AttemptStatus;

  // Duration in seconds
  @Column({ nullable: true })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}

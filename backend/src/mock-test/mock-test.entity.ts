import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('mock_tests')
export class MockTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. MAGICA0009

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  sections: {
    speaking: string[];   // question IDs
    writing: string[];
    reading: string[];
    listening: string[];
  };

  @Column({ default: 180 }) // 3 hours in minutes
  durationMinutes: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  updatedYear: string;

  @OneToMany(() => MockTestAttempt, (a) => a.mockTest)
  attempts: MockTestAttempt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum MockTestAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

@Entity('mock_test_attempts')
export class MockTestAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.mockTestAttempts, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => MockTest, (m) => m.attempts, { onDelete: 'CASCADE' })
  @JoinColumn()
  mockTest: MockTest;

  @Column()
  mockTestId: string;

  @Column({ type: 'enum', enum: MockTestAttemptStatus, default: MockTestAttemptStatus.IN_PROGRESS })
  status: MockTestAttemptStatus;

  // Current question index
  @Column({ default: 0 })
  currentQuestionIndex: number;

  // Answers saved during the test: { questionId: answer }
  @Column({ type: 'jsonb', default: {} })
  answers: Record<string, any>;

  // Final scores
  @Column({ type: 'float', nullable: true })
  totalScore: number;

  @Column({ type: 'jsonb', nullable: true })
  sectionScores: {
    speaking: number;
    writing: number;
    reading: number;
    listening: number;
  };

  // Time remaining in seconds when saved
  @Column({ nullable: true })
  timeRemainingSeconds: number;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

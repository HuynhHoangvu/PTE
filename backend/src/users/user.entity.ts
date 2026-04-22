import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Attempt } from '../attempts/attempt.entity';
import { MockTestAttempt } from '../mock-test/mock-test-attempt.entity';

export enum UserPlan {
  FREE = 'free',
  PREMIUM = 'premium',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserPlan, default: UserPlan.FREE })
  plan: UserPlan;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 0 })
  streakDays: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastActiveAt: Date;

  @Column({ default: 0 })
  totalAttempts: number;

  @Column({ type: 'float', default: 0 })
  averageScore: number;

  @OneToMany(() => Attempt, (a) => a.user)
  attempts: Attempt[];

  @OneToMany(() => MockTestAttempt, (m) => m.user)
  mockTestAttempts: MockTestAttempt[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

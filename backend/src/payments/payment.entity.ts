import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PaymentStatus {
  PENDING   = 'pending',
  VERIFIED  = 'verified',
  REJECTED  = 'rejected',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  planName: string; // '20 ngày', '150 ngày', '300 ngày'

  @Column()
  durationDays: number;

  @Column()
  amountVnd: number;

  @Column()
  transferContent: string; // "FLY NGUYEN VAN A 20N"

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true, type: 'timestamp' })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

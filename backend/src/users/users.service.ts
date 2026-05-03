import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Attempt, AttemptStatus } from '../attempts/attempt.entity';
import { QuestionSkill } from '../questions/question.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...rest } = user;
    return rest;
  }

  async updateProfile(userId: string, dto: { fullName?: string; avatarUrl?: string }) {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  /** Cập nhật streak + lastActiveAt (đăng nhập: kèm loginCount + lastLoginAt). */
  async recordSuccessfulLogin(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    const now = new Date();
    user.loginCount = (user.loginCount ?? 0) + 1;
    user.lastLoginAt = now;
    this.applyStreakActivity(user, now);
    await this.userRepo.save(user);
  }

  /** Streak theo ngày luyện bài (sau khi bài được chấm xong). */
  async recordPracticeActivity(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;
    const now = new Date();
    this.applyStreakActivity(user, now);
    await this.userRepo.save(user);
  }

  private applyStreakActivity(user: User, now: Date) {
    const last = user.lastActiveAt;
    if (last) {
      const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
      if (diffDays === 1) user.streakDays += 1;
      else if (diffDays > 1) user.streakDays = 1;
    } else {
      user.streakDays = 1;
    }
    user.lastActiveAt = now;
  }

  async getStats(userId: string) {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: AttemptStatus.SCORED },
      relations: ['question'],
      order: { createdAt: 'DESC' },
    });

    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts > 0
        ? attempts.reduce((s, a) => s + (a.totalScore || 0), 0) / totalAttempts
        : 0;

    // Per-skill breakdown
    const skillStats: Record<string, { count: number; avgScore: number }> = {};
    for (const skill of Object.values(QuestionSkill)) {
      const skillAttempts = attempts.filter((a) => a.question?.skill === skill);
      skillStats[skill] = {
        count: skillAttempts.length,
        avgScore:
          skillAttempts.length > 0
            ? skillAttempts.reduce((s, a) => s + (a.totalScore || 0), 0) / skillAttempts.length
            : 0,
      };
    }

    // Recent 10
    const recentAttempts = attempts.slice(0, 10).map((a) => ({
      id: a.id,
      questionCode: a.question?.code,
      questionType: a.question?.type,
      skill: a.question?.skill,
      score: a.totalScore,
      status: a.status,
      createdAt: a.createdAt,
    }));

    const user = await this.userRepo.findOne({ where: { id: userId } });

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 10) / 10,
      streakDays: user?.streakDays || 0,
      plan: user?.plan || 'free',
      skillStats,
      recentAttempts,
    };
  }

  async getLeaderboard() {
    return this.userRepo.find({
      select: ['id', 'fullName', 'avatarUrl', 'averageScore', 'totalAttempts', 'streakDays'],
      order: { averageScore: 'DESC' },
      take: 20,
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Question, QuestionSkill, QuestionType, QuestionLevel } from './question.entity';
import { Attempt } from '../attempts/attempt.entity';

export interface QuestionListQuery {
  skill?: QuestionSkill;
  type?: QuestionType;
  level?: QuestionLevel;
  isTrending?: boolean;
  isRepeated?: boolean;
  bookmarked?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
  ) {}

  async findAll(query: QuestionListQuery, userId?: string) {
    const { skill, type, level, isTrending, isRepeated, search, page = 1, limit = 50 } = query;

    const qb = this.questionRepo.createQueryBuilder('q');

    if (skill) qb.andWhere('q.skill = :skill', { skill });
    if (type) qb.andWhere('q.type = :type', { type });
    /** RFIB* = Reading FIB (kéo thả), RWFIB* = R&W FIB (dropdown) — lọc theo mã tránh trùng type trong DB làm lệch drawer */
    if (type === QuestionType.READING_FIB_R_W) {
      qb.andWhere('q.code ILIKE :rwfibCode', { rwfibCode: 'RWFIB%' });
    } else if (type === QuestionType.READING_FIB_R) {
      qb.andWhere('q.code ILIKE :rfibCode', { rfibCode: 'RFIB%' });
    }
    if (level) qb.andWhere('q.level = :level', { level });
    if (isTrending !== undefined) qb.andWhere('q.isTrending = :isTrending', { isTrending });
    if (isRepeated !== undefined) qb.andWhere('q.isRepeated = :isRepeated', { isRepeated });
    if (search) {
      qb.andWhere('(q.title ILIKE :s OR q.code ILIKE :s)', { s: `%${search}%` });
    }

    qb.orderBy('q.code', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [questions, total] = await qb.getManyAndCount();

    // If userId provided, attach user's score for each question
    let questionsWithScore = questions;
    if (userId) {
      questionsWithScore = await Promise.all(
        questions.map(async (q) => {
          const lastAttempt = await this.attemptRepo.findOne({
            where: { questionId: q.id, userId, status: 'SCORED' as any },
            order: { createdAt: 'DESC' },
          });
          return { ...q, userScore: lastAttempt?.totalScore || 0 };
        }),
      );
    }

    return {
      data: questionsWithScore,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const q = await this.questionRepo.findOne({ where: { id } });
    if (!q) {
      // Try by code
      const byCode = await this.questionRepo.findOne({ where: { code: id } });
      if (!byCode) throw new NotFoundException('Question not found');
      return byCode;
    }
    return q;
  }

  async getBySkill(skill: QuestionSkill) {
    // Group by type with counts and user progress
    const types = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.type', 'type')
      .addSelect('COUNT(*)', 'total')
      .where('q.skill = :skill', { skill })
      .groupBy('q.type')
      .getRawMany();
    return types;
  }

  async getSkillProgress(skill: QuestionSkill, userId: string) {
    const questions = await this.questionRepo.find({ where: { skill } });
    const qids = questions.map((q) => q.id);
    /** Có attempt (mọi trạng thái) = đã làm — gồm SCORING/ERROR để không tụt về 0 khi chấm chậm */
    let attemptedIds = new Set<string>();
    if (qids.length) {
      const rows = await this.attemptRepo.find({
        where: { userId, questionId: In(qids) },
        select: ['questionId'],
      });
      attemptedIds = new Set(rows.map((r) => r.questionId));
    }

    const byType: Record<string, { total: number; done: number }> = {};
    for (const q of questions) {
      if (!byType[q.type]) byType[q.type] = { total: 0, done: 0 };
      byType[q.type].total++;
      if (attemptedIds.has(q.id)) byType[q.type].done++;
    }
    return byType;
  }

  async create(dto: Partial<Question>) {
    const q = this.questionRepo.create(dto);
    return this.questionRepo.save(q);
  }

  async update(id: string, dto: Partial<Question>) {
    await this.questionRepo.update(id, dto);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.questionRepo.delete(id);
    return { deleted: true };
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.questionRepo.findBy({ id: In(ids) });
  }

  async getAdjacentQuestion(currentCode: string, direction: 'prev' | 'next', type: QuestionType) {
    const questions = await this.questionRepo.find({
      where: { type },
      order: { code: 'ASC' },
      select: ['id', 'code'],
    });
    const fibFiltered = questions.filter((q) => {
      if (type === QuestionType.READING_FIB_R_W) return /^RWFIB/i.test(q.code);
      if (type === QuestionType.READING_FIB_R) return /^RFIB/i.test(q.code);
      return true;
    });
    // Sắp xếp tự nhiên (RFIB2 trước RFIB10) — order SQL theo chuỗi không đủ với mã số trong code.
    const sorted = [...fibFiltered].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }),
    );
    const idx = sorted.findIndex((q) => q.code === currentCode);
    if (direction === 'prev' && idx > 0) return sorted[idx - 1];
    if (direction === 'next' && idx < sorted.length - 1) return sorted[idx + 1];
    return null;
  }
}

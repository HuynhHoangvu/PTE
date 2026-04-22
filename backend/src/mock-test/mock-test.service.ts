// mock-test.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MockTest, MockTestAttempt, MockTestAttemptStatus } from './mock-test.entity';
import { Question } from '../questions/question.entity';

@Injectable()
export class MockTestService {
  constructor(
    @InjectRepository(MockTest) private mockTestRepo: Repository<MockTest>,
    @InjectRepository(MockTestAttempt) private attemptRepo: Repository<MockTestAttempt>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
  ) {}

  async findAll() {
    return this.mockTestRepo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string) {
    const mt = await this.mockTestRepo.findOne({ where: { id } });
    if (!mt) throw new NotFoundException('Mock test not found');
    return mt;
  }

  async getAttemptById(attemptId: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, userId },
      relations: ['mockTest'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getUserHistory(userId: string) {
    return this.attemptRepo.find({
      where: { userId },
      relations: ['mockTest'],
      order: { createdAt: 'DESC' },
    });
  }

  async startAttempt(userId: string, mockTestId: string) {
    const mockTest = await this.findOne(mockTestId);

    // Check for existing in-progress attempt
    let attempt = await this.attemptRepo.findOne({
      where: { userId, mockTestId, status: MockTestAttemptStatus.IN_PROGRESS },
    });

    const allQuestionIds = [
      ...mockTest.sections.speaking,
      ...mockTest.sections.writing,
      ...mockTest.sections.reading,
      ...mockTest.sections.listening,
    ];

    const loadQuestions = async () => {
      const raw = await this.questionRepo.findBy({ id: In(allQuestionIds) });
      const map = new Map(raw.map((q) => [q.id, q]));
      return allQuestionIds.map((id) => map.get(id)).filter(Boolean);
    };

    if (attempt) {
      const questions = await loadQuestions();
      return { attempt, mockTest, resumed: true, questions };
    }

    // Create new attempt
    attempt = this.attemptRepo.create({
      userId,
      mockTestId,
      startedAt: new Date(),
      timeRemainingSeconds: mockTest.durationMinutes * 60,
    });
    await this.attemptRepo.save(attempt);

    const questions = await loadQuestions();
    return { attempt, mockTest, questions, resumed: false };
  }

  async saveProgress(attemptId: string, userId: string, body: {
    answers?: Record<string, any>;
    currentQuestionIndex?: number;
    timeRemainingSeconds?: number;
  }) {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException();

    await this.attemptRepo.update(attemptId, {
      answers: { ...attempt.answers, ...body.answers },
      currentQuestionIndex: body.currentQuestionIndex ?? attempt.currentQuestionIndex,
      timeRemainingSeconds: body.timeRemainingSeconds ?? attempt.timeRemainingSeconds,
    });

    return { saved: true };
  }

  async submitAttempt(attemptId: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, userId },
      relations: ['mockTest'],
    });
    if (!attempt) throw new NotFoundException();

    // Basic scoring: count answered questions per section
    const mt = attempt.mockTest;
    const sectionScores = {
      speaking: this.calcSectionScore(attempt.answers, mt.sections.speaking),
      writing: this.calcSectionScore(attempt.answers, mt.sections.writing),
      reading: this.calcSectionScore(attempt.answers, mt.sections.reading),
      listening: this.calcSectionScore(attempt.answers, mt.sections.listening),
    };

    const totalScore = Math.round(
      Object.values(sectionScores).reduce((a, b) => a + b, 0) / 4,
    );

    await this.attemptRepo.update(attemptId, {
      status: MockTestAttemptStatus.COMPLETED,
      completedAt: new Date(),
      totalScore,
      sectionScores,
    });

    return { totalScore, sectionScores };
  }

  private calcSectionScore(answers: Record<string, any>, questionIds: string[]) {
    if (!questionIds.length) return 0;
    const answered = questionIds.filter((id) => answers[id] !== undefined).length;
    return Math.round((answered / questionIds.length) * 90);
  }
}

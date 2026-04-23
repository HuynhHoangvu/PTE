import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MockTest, MockTestAttempt, MockTestAttemptStatus } from './mock-test.entity';
import { Question } from '../questions/question.entity';
import { Attempt, AttemptStatus } from '../attempts/attempt.entity';

@Injectable()
export class MockTestService {
  constructor(
    @InjectRepository(MockTest)       private mockTestRepo:  Repository<MockTest>,
    @InjectRepository(MockTestAttempt) private attemptRepo:  Repository<MockTestAttempt>,
    @InjectRepository(Question)        private questionRepo: Repository<Question>,
    @InjectRepository(Attempt)         private practiceRepo: Repository<Attempt>,
  ) {}

  async findAll() {
    return this.mockTestRepo.find({ where: { isActive: true }, order: { code: 'ASC' } });
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

  async saveProgress(
    attemptId: string,
    userId: string,
    body: { answers?: Record<string, any>; currentQuestionIndex?: number; timeRemainingSeconds?: number },
  ) {
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

    const mt = attempt.mockTest;
    const answers = attempt.answers || {};

    // Load all questions for proper scoring
    const allIds = [
      ...mt.sections.speaking,
      ...mt.sections.writing,
      ...mt.sections.reading,
      ...mt.sections.listening,
    ];
    const questions = await this.questionRepo.findBy({ id: In(allIds) });
    const qMap = new Map(questions.map((q) => [q.id, q]));

    const [speaking, writing, reading, listening] = await Promise.all([
      this.scoreSpeakingSection(userId, mt.sections.speaking, answers),
      this.scoreWritingSection(mt.sections.writing, answers, qMap),
      this.scoreObjectiveSection(mt.sections.reading, answers, qMap),
      this.scoreObjectiveSection(mt.sections.listening, answers, qMap),
    ]);

    const sectionScores = { speaking, writing, reading, listening };
    const totalScore = Math.round((speaking + writing + reading + listening) / 4);

    await this.attemptRepo.update(attemptId, {
      status:       MockTestAttemptStatus.COMPLETED,
      completedAt:  new Date(),
      totalScore,
      sectionScores,
    });

    return { totalScore, sectionScores, attemptId };
  }

  // ── Speaking: look up AI scores from practice attempts ──────────────────
  private async scoreSpeakingSection(
    userId: string,
    questionIds: string[],
    answers: Record<string, any>,
  ): Promise<number> {
    if (!questionIds.length) return 0;
    const scores: number[] = [];

    for (const qid of questionIds) {
      const answer = answers[qid];
      if (!answer) continue; // unanswered

      // Answer stored as { attemptId: 'xxx' } when audio was submitted
      const attemptId = typeof answer === 'object' ? answer.attemptId : null;
      if (attemptId) {
        const prac = await this.practiceRepo.findOne({ where: { id: attemptId } });
        if (prac?.totalScore != null) {
          scores.push(prac.totalScore);
          continue;
        }
      }
      // Recorded but score not yet available → give credit 50/90
      scores.push(50);
    }

    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ── Writing: word-count heuristic ───────────────────────────────────────
  private scoreWritingSection(
    questionIds: string[],
    answers: Record<string, any>,
    qMap: Map<string, Question>,
  ): number {
    if (!questionIds.length) return 0;
    const scores: number[] = [];

    for (const qid of questionIds) {
      const text = answers[qid];
      if (!text || typeof text !== 'string') continue;
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const q = qMap.get(qid);
      if (q?.type === 'WRITING_ESSAY') {
        // Ideal: 200-300 words
        if (words >= 200) scores.push(72);
        else if (words >= 150) scores.push(58);
        else if (words >= 100) scores.push(42);
        else scores.push(25);
      } else {
        // Summarize: 5-75 words
        if (words >= 5 && words <= 75) scores.push(68);
        else scores.push(30);
      }
    }

    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ── Reading / Listening: compare with correct answers ──────────────────
  private scoreObjectiveSection(
    questionIds: string[],
    answers: Record<string, any>,
    qMap: Map<string, Question>,
  ): number {
    if (!questionIds.length) return 0;
    const scores: number[] = [];

    for (const qid of questionIds) {
      const answer = answers[qid];
      if (answer === undefined || answer === null) continue;
      const q = qMap.get(qid);
      if (!q) continue;

      const score = this.compareAnswer(answer, q.correctAnswer, q.type);
      scores.push(score);
    }

    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private compareAnswer(answer: any, correctAnswer: any, type: string): number {
    if (!correctAnswer) return 45; // No key → partial credit

    // MCQ multiple: partial credit per correct option
    if (type === 'READING_MCQ_MULTIPLE_ANSWER' || type === 'LISTENING_MCQ_MULTIPLE_ANSWER') {
      const selected = Array.isArray(answer) ? answer : [];
      const correct  = Array.isArray(correctAnswer) ? correctAnswer : Object.values(correctAnswer as any);
      const hits   = selected.filter((a: string) => correct.includes(a)).length;
      const misses = selected.filter((a: string) => !correct.includes(a)).length;
      return Math.round(Math.max(0, (hits - misses) / Math.max(correct.length, 1)) * 90);
    }

    // MCQ single / select missing / highlight correct summary
    if (
      type === 'READING_MCQ_SINGLE_ANSWER' || type === 'LISTENING_MCQ_SINGLE_ANSWER' ||
      type === 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY' || type === 'LISTENING_SELECT_MISSING_WORD'
    ) {
      const selected = Array.isArray(answer) ? answer[0] : answer;
      const correct  = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;
      return selected === correct ? 90 : 0;
    }

    // Re-order paragraphs: position-based partial credit
    if (type === 'READING_RE_ORDER_PARAGRAPH') {
      const sel = Array.isArray(answer) ? answer : [];
      const cor = Array.isArray(correctAnswer) ? correctAnswer : [];
      const hits = sel.filter((item: string, i: number) => item === cor[i]).length;
      return Math.round((hits / Math.max(cor.length, 1)) * 90);
    }

    // FIB reading (select word from bank)
    if (type === 'READING_FIB_R' || type === 'READING_FIB_R_W') {
      // Crawl RWFIB lưu correctAnswer là mảng theo thứ tự ô trống; seed dùng object { "1": "..." }.
      let corNorm: Record<string, string> | null = null;
      if (Array.isArray(correctAnswer)) {
        corNorm = Object.fromEntries(
          (correctAnswer as any[]).map((v, i) => [String(i + 1), typeof v === 'string' ? v : String(v ?? '')]),
        );
      } else if (correctAnswer && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
        corNorm = correctAnswer as Record<string, string>;
      }
      if (typeof answer === 'object' && corNorm) {
        const keys = Object.keys(corNorm);
        const hits = keys.filter((k) =>
          ((answer as any)[k] || '').toLowerCase().trim() === ((corNorm as any)[k] || '').toLowerCase().trim()
        ).length;
        return Math.round((hits / Math.max(keys.length, 1)) * 90);
      }
    }

    // FIB listening (type words)
    if (type === 'LISTENING_FIB_L') {
      if (typeof answer === 'object' && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)) {
        const keys = Object.keys(correctAnswer as Record<string, string>);
        const hits = keys.filter((k) =>
          ((answer as any)[k] || '').toLowerCase().trim() === ((correctAnswer as any)[k] || '').toLowerCase().trim()
        ).length;
        return Math.round((hits / Math.max(keys.length, 1)) * 90);
      }
    }

    // Write from dictation
    if (type === 'LISTENING_DICTATION') {
      const aStr = (typeof answer === 'string' ? answer : '').toLowerCase().trim();
      const cStr = (typeof correctAnswer === 'string' ? correctAnswer : '').toLowerCase().trim();
      const aWords = aStr.split(/\s+/).filter(Boolean);
      const cWords = cStr.split(/\s+/).filter(Boolean);
      const hits = aWords.filter((w: string, i: number) => w === cWords[i]).length;
      return Math.round((hits / Math.max(cWords.length, 1)) * 90);
    }

    // Highlight incorrect words
    if (type === 'LISTENING_HIGHLIGHT_INCORRECT_WORD') {
      const sel = Array.isArray(answer) ? answer : [];
      const cor = Array.isArray(correctAnswer) ? correctAnswer : [];
      const hits   = sel.filter((a: number) => cor.includes(a)).length;
      const misses = sel.filter((a: number) => !cor.includes(a)).length;
      return Math.round(Math.max(0, (hits - misses) / Math.max(cor.length, 1)) * 90);
    }

    return 45; // fallback partial credit
  }
}

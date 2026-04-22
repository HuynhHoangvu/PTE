import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Attempt, AttemptStatus } from './attempt.entity';
import { Question } from '../questions/question.entity';
import { User } from '../users/user.entity';
import { AiScoringService } from '../ai-scoring/ai-scoring.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private aiScoringService: AiScoringService,
    private storageService: StorageService,
  ) {}

  async submitSpeaking(params: {
    userId: string;
    questionId: string;
    audioBuffer?: Buffer;
    duration?: number;
  }) {
    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: params.userId } });
    if (!user) throw new NotFoundException('User not found');

    const question = await this.questionRepo.findOne({ where: { id: params.questionId } });
    if (!question) throw new NotFoundException('Question not found');

    // Create attempt in SCORING state
    const attempt = this.attemptRepo.create({
      userId: params.userId,
      questionId: params.questionId,
      duration: params.duration,
      status: AttemptStatus.SCORING,
    });
    await this.attemptRepo.save(attempt);

    // Save audio file (local disk or GCS depending on NODE_ENV)
    if (params.audioBuffer) {
      const audioUrl = await this.storageService.saveAudio(attempt.id, params.audioBuffer);
      await this.attemptRepo.update(attempt.id, { audioUrl });
    }

    // Score asynchronously
    this.scoreAttemptAsync(attempt, question, params.audioBuffer).catch((err) =>
      this.attemptRepo.update(attempt.id, { status: AttemptStatus.ERROR }),
    );

    return { id: attempt.id, status: attempt.status, message: 'Scoring in progress...' };
  }

  private static readonly INSTANT_SCORE_TYPES = new Set([
    'READING_MCQ_MULTIPLE_ANSWER', 'LISTENING_MCQ_MULTIPLE_ANSWER',
    'READING_MCQ_SINGLE_ANSWER', 'LISTENING_MCQ_SINGLE_ANSWER',
    'LISTENING_HIGHLIGHT_CORRECT_SUMMARY', 'LISTENING_SELECT_MISSING_WORD',
    'READING_RE_ORDER_PARAGRAPH', 'LISTENING_HIGHLIGHT_INCORRECT_WORD',
    'READING_FIB_R_W', 'READING_FIB_R', 'LISTENING_FIB_L', 'LISTENING_DICTATION',
  ]);

  async submitText(params: {
    userId: string;
    questionId: string;
    textAnswer?: string;
    selectedAnswers?: any;
    duration?: number;
  }) {
    const user = await this.userRepo.findOne({ where: { id: params.userId } });
    if (!user) throw new NotFoundException('User not found');

    const question = await this.questionRepo.findOne({ where: { id: params.questionId } });
    if (!question) throw new NotFoundException('Question not found');

    const attempt = this.attemptRepo.create({
      userId: params.userId,
      questionId: params.questionId,
      textAnswer: params.textAnswer,
      selectedAnswers: params.selectedAnswers,
      duration: params.duration,
      status: AttemptStatus.SCORING,
    });
    await this.attemptRepo.save(attempt);

    // Deterministic types: score synchronously and return result immediately
    if (AttemptsService.INSTANT_SCORE_TYPES.has(question.type)) {
      try {
        const result = await this.aiScoringService.scoreAttempt({
          question,
          textAnswer: params.textAnswer,
          selectedAnswers: params.selectedAnswers,
        });
        await this.attemptRepo.update(attempt.id, {
          totalScore: result.totalScore,
          scoreBreakdown: result.scoreBreakdown,
          feedback: result.feedback,
          status: AttemptStatus.SCORED,
        });
        await this.updateUserStats(params.userId);
        return {
          id: attempt.id,
          status: AttemptStatus.SCORED,
          totalScore: result.totalScore,
          scoreBreakdown: result.scoreBreakdown,
          feedback: result.feedback,
        };
      } catch {
        await this.attemptRepo.update(attempt.id, { status: AttemptStatus.ERROR });
        return { id: attempt.id, status: AttemptStatus.ERROR, message: 'Scoring failed' };
      }
    }

    // AI types: score asynchronously
    this.scoreAttemptAsync(attempt, question).catch(() =>
      this.attemptRepo.update(attempt.id, { status: AttemptStatus.ERROR }),
    );
    return { id: attempt.id, status: attempt.status, message: 'Scoring in progress...' };
  }

  private async scoreAttemptAsync(attempt: Attempt, question: Question, audioBuffer?: Buffer) {
    try {
      const result = await this.aiScoringService.scoreAttempt({
        question,
        textAnswer: attempt.textAnswer,
        selectedAnswers: attempt.selectedAnswers,
        audioBuffer,
        audioFilename: audioBuffer ? 'audio.webm' : undefined,
        duration: attempt.duration,
      });

      await this.attemptRepo.update(attempt.id, {
        totalScore: result.totalScore,
        scoreBreakdown: result.scoreBreakdown,
        feedback: result.feedback,
        transcription: result.transcription,
        status: AttemptStatus.SCORED,
      });

      // Update user stats
      await this.updateUserStats(attempt.userId);
    } catch (err) {
      await this.attemptRepo.update(attempt.id, { status: AttemptStatus.ERROR });
    }
  }

  private async updateUserStats(userId: string) {
    const scored = await this.attemptRepo.find({
      where: { userId, status: AttemptStatus.SCORED },
    });
    const avg = scored.length > 0
      ? scored.reduce((s, a) => s + (a.totalScore || 0), 0) / scored.length
      : 0;

    await this.userRepo.update(userId, {
      totalAttempts: scored.length,
      averageScore: Math.round(avg * 10) / 10,
    });
  }

  async getAttempt(id: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id },
      relations: ['question'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getAttemptsByQuestion(questionId: string, userId: string) {
    return this.attemptRepo.find({
      where: { questionId, userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async pollScore(id: string) {
    const attempt = await this.attemptRepo.findOne({ where: { id } });
    if (!attempt) throw new NotFoundException();
    return {
      id: attempt.id,
      status: attempt.status,
      totalScore: attempt.totalScore,
      scoreBreakdown: attempt.scoreBreakdown,
      feedback: attempt.feedback,
      transcription: attempt.transcription,
    };
  }
}

import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Attempt, AttemptStatus } from './attempt.entity';
import { Question } from '../questions/question.entity';
import { isDeterministicQuestionType } from '../questions/deterministic-types';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AiScoringService } from '../ai-scoring/ai-scoring.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private aiScoringService: AiScoringService,
    private storageService: StorageService,
    private usersService: UsersService,
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

    if (!params.audioBuffer?.length) {
      throw new BadRequestException('Audio is required (file or audioBase64)');
    }

    // Create attempt in SCORING state
    const attempt = this.attemptRepo.create({
      userId: params.userId,
      questionId: params.questionId,
      duration: params.duration,
      status: AttemptStatus.SCORING,
    });
    await this.attemptRepo.save(attempt);

    const audioUrl = await this.storageService.saveAudio(attempt.id, params.audioBuffer);
    await this.attemptRepo.update(attempt.id, { audioUrl });

    // Score asynchronously
    this.scoreAttemptAsync(attempt, question, params.audioBuffer).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`submitSpeaking async scoring failed for attempt=${attempt.id}: ${msg}`);
      await this.attemptRepo.update(attempt.id, {
        status: AttemptStatus.ERROR,
        feedback: `Scoring failed: ${msg}`,
      });
    });

    return { id: attempt.id, status: attempt.status, message: 'Scoring in progress...' };
  }

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
    if (isDeterministicQuestionType(question.type)) {
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
        await this.usersService.recordPracticeActivity(params.userId);
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
    this.scoreAttemptAsync(attempt, question).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`submitText async scoring failed for attempt=${attempt.id}: ${msg}`);
      await this.attemptRepo.update(attempt.id, {
        status: AttemptStatus.ERROR,
        feedback: `Scoring failed: ${msg}`,
      });
    });
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
        tutorTip: (result as any).tutorTip || '',
        wordErrors: (result as any).wordErrors || [],
        vocabSuggestions: (result as any).vocabSuggestions || [],
        status: AttemptStatus.SCORED,
      });

      // Update user stats
      await this.updateUserStats(attempt.userId);
      await this.usersService.recordPracticeActivity(attempt.userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`scoreAttemptAsync failed for attempt=${attempt.id}: ${msg}`);
      await this.attemptRepo.update(attempt.id, {
        status: AttemptStatus.ERROR,
        feedback: `Scoring failed: ${msg}`,
      });
      throw err;
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

  async getAttempt(id: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id, userId },
      relations: ['question'],
      select: {
        id: true,
        userId: true,
        questionId: true,
        audioUrl: true,
        textAnswer: true,
        selectedAnswers: true,
        totalScore: true,
        scoreBreakdown: true,
        feedback: true,
        tutorTip: true,
        wordErrors: true,
        vocabSuggestions: true,
        transcription: true,
        status: true,
        duration: true,
        createdAt: true,
        question: {
          id: true,
          code: true,
          title: true,
          content: true,
          type: true,
          skill: true,
          level: true,
          tips: true,
          audioUrl: true,
          imageUrl: true,
          options: true,
          correctAnswer: true,
          suggestedAnswer: true,
          prepTime: true,
          responseTime: true,
          minWords: true,
          maxWords: true,
          isTrending: true,
          isRepeated: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getAttemptsByQuestion(questionId: string, userId: string) {
    return this.attemptRepo.find({
      where: { questionId, userId },
      select: {
        id: true,
        userId: true,
        questionId: true,
        audioUrl: true,
        textAnswer: true,
        selectedAnswers: true,
        totalScore: true,
        scoreBreakdown: true,
        feedback: true,
        tutorTip: true,
        wordErrors: true,
        vocabSuggestions: true,
        transcription: true,
        status: true,
        duration: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async pollScore(id: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        totalScore: true,
        scoreBreakdown: true,
        feedback: true,
        transcription: true,
        tutorTip: true,
        wordErrors: true,
        vocabSuggestions: true,
      },
    });
    if (!attempt) throw new NotFoundException();
    return {
      id: attempt.id,
      status: attempt.status,
      totalScore: attempt.totalScore,
      scoreBreakdown: attempt.scoreBreakdown,
      feedback: attempt.feedback,
      transcription: attempt.transcription,
      tutorTip: attempt.tutorTip,
      wordErrors: attempt.wordErrors,
      vocabSuggestions: attempt.vocabSuggestions,
    };
  }

  async getAttemptAudio(id: string, userId: string): Promise<Buffer | null> {
    const attempt = await this.attemptRepo.findOne({ where: { id, userId } });
    if (!attempt) throw new NotFoundException();
    return this.storageService.getAudioData(id);
  }
}

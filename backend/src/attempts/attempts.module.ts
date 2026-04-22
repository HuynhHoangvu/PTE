import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { Attempt } from './attempt.entity';
import { Question } from '../questions/question.entity';
import { User } from '../users/user.entity';
import { AiScoringModule } from '../ai-scoring/ai-scoring.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attempt, Question, User]),
    AiScoringModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}

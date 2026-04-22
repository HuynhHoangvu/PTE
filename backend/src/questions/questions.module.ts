import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question } from './question.entity';
import { Attempt } from '../attempts/attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Attempt]),
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

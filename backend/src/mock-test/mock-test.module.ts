import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockTestController } from './mock-test.controller';
import { MockTestService } from './mock-test.service';
import { MockTest, MockTestAttempt } from './mock-test.entity';
import { Question } from '../questions/question.entity';
import { AiScoringModule } from '../ai-scoring/ai-scoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MockTest, MockTestAttempt, Question]),
    AiScoringModule,
  ],
  controllers: [MockTestController],
  providers: [MockTestService],
})
export class MockTestModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { MockTestAttempt } from '../mock-test/mock-test.entity';
import { Attempt } from '../attempts/attempt.entity';
import { Question } from '../questions/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MockTestAttempt, Attempt, Question])],
  controllers: [AdminController],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';
import { MockTestModule } from './mock-test/mock-test.module';
import { AiScoringModule } from './ai-scoring/ai-scoring.module';
import { StorageModule } from './common/storage/storage.module';
import { User } from './users/user.entity';
import { Question } from './questions/question.entity';
import { Attempt } from './attempts/attempt.entity';
import { MockTest } from './mock-test/mock-test.entity';
import { MockTestAttempt } from './mock-test/mock-test-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'fly_edu',
      entities: [User, Question, Attempt, MockTest, MockTestAttempt],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    StorageModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    AttemptsModule,
    MockTestModule,
    AiScoringModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

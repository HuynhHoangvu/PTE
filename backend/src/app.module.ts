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
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { Payment } from './payments/payment.entity';
import { AutoSeedService } from './database/auto-seed.service';
import { User } from './users/user.entity';
import { Question } from './questions/question.entity';
import { Attempt } from './attempts/attempt.entity';
import { MockTest } from './mock-test/mock-test.entity';
import { MockTestAttempt } from './mock-test/mock-test-attempt.entity';

const databaseUrl = process.env.DATABASE_URL?.trim();
const isLocalPostgres = (): boolean => {
  if (databaseUrl) {
    try {
      const h = new URL(databaseUrl).hostname;
      return h === 'localhost' || h === '127.0.0.1';
    } catch {
      return false;
    }
  }
  const h = (process.env.DB_HOST || 'localhost').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1';
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl || undefined,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      /** `??` giữ mật khẩu rỗng nếu .env có DB_PASSWORD= (trust); không có biến → fallback dev */
      password: process.env.DB_PASSWORD ?? 'password',
      database: process.env.DB_DATABASE || 'fly_edu',
      entities: [User, Question, Attempt, MockTest, MockTestAttempt, Payment],
      synchronize: true,
      logging: false,
      ssl:
        databaseUrl && !databaseUrl.includes('.internal') && !isLocalPostgres()
          ? { rejectUnauthorized: false }
          : false,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    TypeOrmModule.forFeature([User]),
    StorageModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    AttemptsModule,
    MockTestModule,
    AiScoringModule,
    AdminModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AutoSeedService],
})
export class AppModule {}

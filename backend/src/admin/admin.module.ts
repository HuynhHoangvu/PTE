import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { MockTestAttempt } from '../mock-test/mock-test.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MockTestAttempt])],
  controllers: [AdminController],
})
export class AdminModule {}

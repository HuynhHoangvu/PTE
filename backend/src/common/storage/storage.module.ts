import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { Attempt } from '../../attempts/attempt.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Attempt])],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attempt } from '../../attempts/attempt.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly databaseUrl = process.env.DATABASE_URL?.trim() || '';

  constructor(
    @InjectRepository(Attempt) private attemptRepo: Repository<Attempt>,
  ) {}

  async saveAudio(attemptId: string, buffer: Buffer): Promise<string> {
    if (this.shouldStoreAudioInDatabase()) {
      await this.attemptRepo.update(attemptId, { audioData: buffer });
      return `/api/attempts/${attemptId}/audio`;
    }

    return this.saveLocal(`audio/${attemptId}.webm`, buffer);
  }

  async getAudioData(attemptId: string): Promise<Buffer | null> {
    const attempt = await this.attemptRepo.findOne({ where: { id: attemptId } });
    if (!attempt) return null;

    if (attempt.audioData?.length) return attempt.audioData;

    if (attempt.audioUrl?.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), attempt.audioUrl.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    return null;
  }

  private saveLocal(filename: string, buffer: Buffer): string {
    const uploadDir = path.join(process.cwd(), 'uploads', path.dirname(filename));
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const outputPath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(outputPath, buffer);
    return `/uploads/${filename}`;
  }

  private shouldStoreAudioInDatabase(): boolean {
    if (process.env.NODE_ENV === 'production') return true;
    if (!this.databaseUrl) return false;

    try {
      const host = new URL(this.databaseUrl).hostname;
      return host !== 'localhost' && host !== '127.0.0.1';
    } catch {
      return false;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  async saveAudio(attemptId: string, buffer: Buffer): Promise<string> {
    if (this.isProduction && this.hasGcsConfig()) {
      return this.uploadToGCS(`audio/${attemptId}.webm`, buffer);
    }
    if (this.isProduction && !this.hasGcsConfig()) {
      this.logger.warn(
        'Missing GCS config (GCS_BUCKET_NAME / GCS_PROJECT_ID / GCS_CLIENT_EMAIL / GCS_PRIVATE_KEY), falling back to local storage.',
      );
    }
    return this.saveLocal(`audio/${attemptId}.webm`, buffer);
  }

  private hasGcsConfig(): boolean {
    return Boolean(
      process.env.GCS_BUCKET_NAME &&
      process.env.GCS_PROJECT_ID &&
      process.env.GCS_CLIENT_EMAIL &&
      process.env.GCS_PRIVATE_KEY,
    );
  }

  private async uploadToGCS(filename: string, buffer: Buffer): Promise<string> {
    // Lazy-load to avoid requiring GCS SDK in local dev
    const { Storage } = await import('@google-cloud/storage');

    const privateKey = (process.env.GCS_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: privateKey,
      },
    });

    const bucket = process.env.GCS_BUCKET_NAME as string;
    const file = storage.bucket(bucket).file(filename);
    await file.save(buffer, { contentType: 'audio/webm', resumable: false });

    return `https://storage.googleapis.com/${bucket}/${filename}`;
  }

  private saveLocal(filename: string, buffer: Buffer): string {
    const uploadDir = path.join(process.cwd(), 'uploads', path.dirname(filename));
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), 'uploads', filename), buffer);
    return `/uploads/${filename}`;
  }
}

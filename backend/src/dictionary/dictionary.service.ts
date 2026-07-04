import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — từ tiếng Anh không đổi nghĩa, cache dài cho đỡ tốn lượt gọi API free

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  private readonly cache = new Map<string, { data: DictionaryEntry; expiresAt: number }>();

  async lookup(rawWord: string): Promise<DictionaryEntry> {
    const word = rawWord.trim().toLowerCase();
    if (!/^[a-z']{1,40}$/.test(word)) {
      throw new NotFoundException('Từ không hợp lệ');
    }

    const cached = this.cache.get(word);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let res: Response;
    try {
      res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`, {
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      this.logger.warn(`Dictionary lookup failed for "${word}": ${err instanceof Error ? err.message : String(err)}`);
      throw new NotFoundException('Không thể tra từ điển lúc này, thử lại sau.');
    }

    if (res.status === 404) {
      throw new NotFoundException(`Không tìm thấy nghĩa của "${word}"`);
    }
    if (!res.ok) {
      throw new NotFoundException('Không thể tra từ điển lúc này, thử lại sau.');
    }

    const raw: any[] = await res.json();
    const entry = this.normalize(word, raw);
    this.cache.set(word, { data: entry, expiresAt: Date.now() + CACHE_TTL_MS });
    return entry;
  }

  private normalize(word: string, raw: any[]): DictionaryEntry {
    const first = raw?.[0] ?? {};
    const phonetic: string | undefined =
      first.phonetic || first.phonetics?.find((p: any) => p.text)?.text || undefined;

    const meanings: DictionaryMeaning[] = (first.meanings ?? []).map((m: any) => ({
      partOfSpeech: m.partOfSpeech || '',
      definitions: (m.definitions ?? []).slice(0, 3).map((d: any) => ({
        definition: d.definition || '',
        example: d.example || undefined,
      })),
    }));

    return { word, phonetic, meanings };
  }
}

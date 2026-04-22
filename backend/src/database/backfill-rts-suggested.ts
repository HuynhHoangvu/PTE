/**
 * Backfill suggestedAnswer cho SPEAKING_RESPOND_TO_SITUATION
 * Dùng Gemini để generate model response cho từng situation.
 *
 * Chạy: npx ts-node src/database/backfill-rts-suggested.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, QuestionSkill, QuestionType } from '../questions/question.entity';

dotenv.config({ path: join(__dirname, '../../.env') });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'fly_edu',
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  synchronize: false,
  logging: false,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function generateSuggestedAnswer(situation: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a PTE Core "Respond to a Situation" speaking examiner providing a model answer.

TASK DESCRIPTION:
In PTE Core "Respond to a Situation", the test taker hears/reads a situation and must respond verbally — like leaving a voicemail, talking to a person, or making a request. They speak for up to 40 seconds (~80–100 words). The response must be direct, purposeful, and address ALL points in the situation.

SITUATION:
"""
${situation}
"""

Write ONLY the spoken words the test taker would say — as if they are actually speaking in that situation right now. Do NOT:
- Describe the situation
- Comment on the platform or content
- Add labels, headers, or meta-commentary
- Start with "Certainly" or "Based on the information"

DO:
- Speak directly as the person in the situation (e.g. "Hi, I'm calling because...")
- Address every key point (reason, request, consequence)
- Use natural spoken English with contractions
- Keep it 80–100 words

Return only the spoken response, nothing else.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function backfill() {
  await ds.initialize();
  console.log('✅ Database connected');

  const repo = ds.getRepository(Question);

  // Lấy tất cả RTS — cả có và chưa có suggestedAnswer (để overwrite nếu muốn)
  const questions = await repo.find({
    where: { type: QuestionType.SPEAKING_RESPOND_TO_SITUATION },
    order: { code: 'ASC' },
  });

  if (questions.length === 0) {
    console.log('⚠️  Không tìm thấy câu RESPOND_TO_SITUATION nào trong database.');
    await ds.destroy();
    return;
  }

  console.log(`\nTìm thấy ${questions.length} câu RTS. Bắt đầu generate...\n`);

  let updated = 0;
  let skipped = 0;

  for (const q of questions) {
    if (!q.content?.trim()) {
      console.log(`⚠️  ${q.code} — không có content, bỏ qua`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`🤖 ${q.code} — đang generate...`);
      const suggested = await generateSuggestedAnswer(q.content);
      await repo.update(q.id, { suggestedAnswer: suggested });
      console.log(` ✅ done (${suggested.split(' ').length} words)`);
      console.log(`   → "${suggested.slice(0, 80)}..."\n`);
      updated++;

      // Rate limit: đợi 1s giữa các request
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
      console.log(` ❌ FAILED: ${err?.message}`);
    }
  }

  console.log(`\n✅ Backfill hoàn tất: ${updated} updated, ${skipped} skipped`);
  await ds.destroy();
}

backfill().catch((err) => {
  console.error('❌ Backfill failed:', err.message);
  process.exit(1);
});

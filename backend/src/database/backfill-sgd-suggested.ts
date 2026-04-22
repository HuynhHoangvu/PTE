/**
 * Backfill suggestedAnswer cho SPEAKING_SUMMARISE_GROUP_DISCUSSION
 * Dùng Gemini để generate model summary response.
 *
 * Chạy: npx ts-node src/database/backfill-sgd-suggested.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, QuestionType } from '../questions/question.entity';

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

async function generateSuggestedAnswer(transcript: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a PTE Core "Summarise Spoken Text / Group Discussion" speaking examiner providing a model answer.

TASK DESCRIPTION:
In PTE Core "Summarise Group Discussion", the test taker listens to a group discussion and must summarise the key points in ~75 seconds (~150–170 words). The spoken summary should:
- Briefly state the topic
- Cover each speaker's main viewpoint (without naming individuals)
- Mention any consensus or outcome if reached
- Be objective, fluent, and well-structured

DISCUSSION TRANSCRIPT:
"""
${transcript}
"""

Write ONLY the spoken words the test taker would say — as if they are speaking right now. Do NOT:
- Include labels, headers, or speaker names in your response
- Add meta-commentary or describe the task
- Start with "Certainly" or "Based on the transcript"

DO:
- Open with a topic sentence (e.g. "The group discussed...")
- Summarise each key perspective neutrally
- Note any points of agreement or conclusion
- Keep it 150–170 words, natural spoken English with contractions

Return only the spoken summary, nothing else.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function backfill() {
  await ds.initialize();
  console.log('✅ Database connected');

  const repo = ds.getRepository(Question);

  const questions = await repo.find({
    where: { type: QuestionType.SPEAKING_SUMMARISE_GROUP_DISCUSSION },
    order: { code: 'ASC' },
  });

  if (questions.length === 0) {
    console.log('⚠️  Không tìm thấy câu SGD nào. Hãy chạy seed trước: npm run seed');
    await ds.destroy();
    return;
  }

  console.log(`\nTìm thấy ${questions.length} câu SGD. Bắt đầu generate...\n`);

  let updated = 0;
  let skipped = 0;

  for (const q of questions) {
    if (!q.content?.trim()) {
      console.log(`⚠️  ${q.code} — không có content, bỏ qua`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`🤖 ${q.code} "${q.title}" — đang generate...`);
      const suggested = await generateSuggestedAnswer(q.content);
      await repo.update(q.id, { suggestedAnswer: suggested });
      console.log(` ✅ done (${suggested.split(' ').length} words)`);
      console.log(`   → "${suggested.slice(0, 80)}..."\n`);
      updated++;

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

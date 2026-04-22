/**
 * Backfill content + suggestedAnswer cho RASA questions có garbage content.
 * Tạo mới situation text từ Gemini rồi generate luôn model response.
 *
 * Chạy: npx ts-node src/database/backfill-rts-content.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, QuestionType, QuestionLevel } from '../questions/question.entity';

dotenv.config({ path: join(__dirname, '../../.env') });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'fly_edu',
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  synchronize: false, logging: false,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Diverse categories to ensure variety across 147 questions
const CATEGORIES = [
  'complaint to a business (wrong order, delayed delivery, poor service)',
  'request at a workplace (schedule change, equipment issue, remote work request)',
  'social situation (neighbour issue, flatmate problem, community complaint)',
  'medical / health appointment (reschedule, request referral, prescription issue)',
  'travel / transport (flight delay, hotel problem, car rental complaint)',
  'education / school (assignment extension, room booking, fee dispute)',
  'utilities / home services (plumber, electrician, internet provider)',
  'banking / financial services (transaction error, card issue, loan query)',
  'government / public service (permit application, fine dispute, lost document)',
  'restaurant / café (wrong dish, allergy concern, reservation issue)',
  'retail / shopping (return item, size exchange, missing online order)',
  'accommodation / rental (maintenance request, lease query, noise complaint)',
  'technology / IT support (broken device, software error, account locked)',
  'sports / recreation centre (membership freeze, class cancellation, refund)',
  'transport / rideshare (incorrect charge, lost item, driver complaint)',
];

function getCategory(index: number): string {
  return CATEGORIES[index % CATEGORIES.length];
}

async function generateSituationAndAnswer(category: string, questionIndex: number): Promise<{ content: string; suggestedAnswer: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are creating content for PTE Core "Respond to a Situation" speaking practice.

CATEGORY: ${category}
QUESTION INDEX: ${questionIndex} (use this to ensure unique, varied scenarios within the same category)

Create a realistic, specific situation that a test taker would respond to verbally (like leaving a voicemail, speaking to someone, or making a request).

Return a JSON object with exactly two keys:
{
  "content": "<situation description: 60-100 words, clearly states WHO the person is, WHAT happened, WHAT they need to do/say. Written as instructions to the test taker. E.g. 'You ordered... Call the... Explain... Ask them to...'>",
  "suggestedAnswer": "<model spoken response: 80-100 words, natural spoken English, directly addresses all points in the situation. Starts with a greeting or direct statement like 'Hi, I'm calling because...' or 'Excuse me, I wanted to...' NOT a description of the situation.>"
}

Return ONLY the JSON, no other text.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Parse JSON — strip markdown fences if present
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  return { content: parsed.content, suggestedAnswer: parsed.suggestedAnswer };
}

async function backfill() {
  await ds.initialize();
  console.log('✅ Database connected');

  const repo = ds.getRepository(Question);

  // Only target questions with garbage content
  const questions = await repo
    .createQueryBuilder('q')
    .where('q.type = :type', { type: QuestionType.SPEAKING_RESPOND_TO_SITUATION })
    .andWhere('q.content LIKE :garbage', { garbage: '%Magic Centre%' })
    .orderBy('q.code', 'ASC')
    .getMany();

  console.log(`\nTìm thấy ${questions.length} câu RASA có garbage content. Bắt đầu generate...\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const category = getCategory(i);

    try {
      process.stdout.write(`🤖 ${q.code} [${category.slice(0, 35)}...] — generating...`);
      const { content, suggestedAnswer } = await generateSituationAndAnswer(category, i);
      await repo.update(q.id, { content, suggestedAnswer });
      console.log(` ✅ (${content.split(' ').length}w / ${suggestedAnswer.split(' ').length}w)`);
      updated++;

      // Rate limit
      await new Promise(r => setTimeout(r, 1200));
    } catch (err: any) {
      console.log(` ❌ FAILED: ${err?.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Backfill hoàn tất: ${updated} updated, ${failed} failed`);
  await ds.destroy();
}

backfill().catch((err) => {
  console.error('❌ Backfill failed:', err.message);
  process.exit(1);
});

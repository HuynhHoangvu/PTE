/**
 * Tạo mock test ngẫu nhiên từ câu hỏi trong DB.
 *
 * Đề tiêu chuẩn (70 câu / bộ):
 *   Speaking 32: 6 RA, 11 RS, 5 DI, 2 RL, 5 ASQ, 2 SGD, 1 RASA
 *   Writing 3:   2 SWT, 1 WE
 *   Reading 20:  7 RWFIB, 2 RMA, 3 ROP, 6 RFIB, 2 RSA  (list gốc 5+4 → +2 RWFIB +2 RFIB để đủ 20)
 *   Listening 15: 1 SST, 2 LMA, 2 LFIB, 2 HCS, 2 LSA, 1 SMW, 2 HIW, 3 WFD
 *
 * Usage:
 *   node scripts/seed-mock-tests.js --replace-all --count 100 --prefix PTE_STD
 *     → XÓA HẾT mock_tests + mock_test_attempts, tạo 100 đề PTE_STD_001 …
 *   node scripts/seed-mock-tests.js --count 5 --prefix MOCK
 *   node scripts/seed-mock-tests.js --legacy-random --count 5   # hành vi cũ (min/max random)
 *
 * Env: DATABASE_URL hoặc DB_* trong .env
 */

const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function parseArgs(argv) {
  const out = {
    count: 5,
    prefix: 'MOCK',
    force: false,
    replaceAll: false,
    legacyRandom: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--count' && argv[i + 1]) out.count = Number(argv[i + 1]);
    if (argv[i] === '--prefix' && argv[i + 1]) out.prefix = argv[i + 1];
    if (argv[i] === '--force') out.force = true;
    if (argv[i] === '--replace-all') out.replaceAll = true;
    if (argv[i] === '--legacy-random') out.legacyRandom = true;
  }
  return out;
}

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Khớp questions.service: R&W FIB chỉ RWFIB*, Reading FIB chỉ RFIB* */
function typeWhereSql(type) {
  if (type === 'READING_FIB_R_W') return `type = $1 AND code ILIKE 'RWFIB%'`;
  if (type === 'READING_FIB_R') return `type = $1 AND code ILIKE 'RFIB%'`;
  return 'type = $1';
}

/**
 * Đề tiêu chuẩn 70 câu — Speaking 32 · Writing 3 · Reading 20 · Listening 15.
 * Thứ tự trong section = thứ tự làm bài (RA → RS → …).
 */
const PTE_STANDARD_FIXED = [
  { type: 'SPEAKING_READ_ALOUD', section: 'speaking', count: 6 },
  { type: 'SPEAKING_REPEAT_SENTENCE', section: 'speaking', count: 11 },
  { type: 'SPEAKING_DESCRIBE_IMAGE', section: 'speaking', count: 5 },
  { type: 'SPEAKING_RETELL_LECTURE', section: 'speaking', count: 2 },
  { type: 'SPEAKING_ANSWER_SHORT_QUESTION', section: 'speaking', count: 5 },
  { type: 'SPEAKING_SUMMARISE_GROUP_DISCUSSION', section: 'speaking', count: 2 },
  { type: 'SPEAKING_RESPOND_TO_SITUATION', section: 'speaking', count: 1 },
  { type: 'WRITING_SUMMARIZE_WRITTEN_TEXT', section: 'writing', count: 2 },
  { type: 'WRITING_ESSAY', section: 'writing', count: 1 },
  { type: 'READING_FIB_R_W', section: 'reading', count: 7 },
  { type: 'READING_MCQ_MULTIPLE_ANSWER', section: 'reading', count: 2 },
  { type: 'READING_RE_ORDER_PARAGRAPH', section: 'reading', count: 3 },
  { type: 'READING_FIB_R', section: 'reading', count: 6 },
  { type: 'READING_MCQ_SINGLE_ANSWER', section: 'reading', count: 2 },
  { type: 'LISTENING_SUMMARIZE_SPOKEN_TEXT', section: 'listening', count: 1 },
  { type: 'LISTENING_MCQ_MULTIPLE_ANSWER', section: 'listening', count: 2 },
  { type: 'LISTENING_FIB_L', section: 'listening', count: 2 },
  { type: 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY', section: 'listening', count: 2 },
  { type: 'LISTENING_MCQ_SINGLE_ANSWER', section: 'listening', count: 2 },
  { type: 'LISTENING_SELECT_MISSING_WORD', section: 'listening', count: 1 },
  { type: 'LISTENING_HIGHLIGHT_INCORRECT_WORD', section: 'listening', count: 2 },
  { type: 'LISTENING_DICTATION', section: 'listening', count: 3 },
];

const STANDARD_TOTAL = PTE_STANDARD_FIXED.reduce((s, x) => s + x.count, 0);

// Legacy: random range per type (script cũ)
const LEGACY_TEMPLATE = [
  { type: 'SPEAKING_READ_ALOUD', section: 'speaking', min: 6, max: 7 },
  { type: 'SPEAKING_REPEAT_SENTENCE', section: 'speaking', min: 10, max: 12 },
  { type: 'SPEAKING_DESCRIBE_IMAGE', section: 'speaking', min: 3, max: 4 },
  { type: 'SPEAKING_RETELL_LECTURE', section: 'speaking', min: 1, max: 2 },
  { type: 'SPEAKING_ANSWER_SHORT_QUESTION', section: 'speaking', min: 5, max: 6 },
  { type: 'SPEAKING_RESPOND_TO_SITUATION', section: 'speaking', min: 2, max: 3 },
  { type: 'SPEAKING_SUMMARISE_GROUP_DISCUSSION', section: 'speaking', min: 1, max: 2 },
  { type: 'WRITING_SUMMARIZE_WRITTEN_TEXT', section: 'writing', min: 1, max: 2 },
  { type: 'WRITING_ESSAY', section: 'writing', min: 1, max: 2 },
  { type: 'READING_FIB_R_W', section: 'reading', min: 5, max: 6 },
  { type: 'READING_MCQ_MULTIPLE_ANSWER', section: 'reading', min: 1, max: 2 },
  { type: 'READING_RE_ORDER_PARAGRAPH', section: 'reading', min: 2, max: 3 },
  { type: 'READING_FIB_R', section: 'reading', min: 4, max: 5 },
  { type: 'READING_MCQ_SINGLE_ANSWER', section: 'reading', min: 1, max: 2 },
  { type: 'LISTENING_SUMMARIZE_SPOKEN_TEXT', section: 'listening', min: 1, max: 2 },
  { type: 'LISTENING_MCQ_MULTIPLE_ANSWER', section: 'listening', min: 1, max: 2 },
  { type: 'LISTENING_FIB_L', section: 'listening', min: 2, max: 3 },
  { type: 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY', section: 'listening', min: 1, max: 2 },
  { type: 'LISTENING_MCQ_SINGLE_ANSWER', section: 'listening', min: 1, max: 2 },
  { type: 'LISTENING_SELECT_MISSING_WORD', section: 'listening', min: 1, max: 2 },
  { type: 'LISTENING_HIGHLIGHT_INCORRECT_WORD', section: 'listening', min: 2, max: 3 },
  { type: 'LISTENING_DICTATION', section: 'listening', min: 3, max: 4 },
];

function makeClient() {
  if (process.env.DATABASE_URL) {
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('.railway.internal')
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'fly_edu',
  });
}

async function pickQuestions(client, slotType, n, usedIds) {
  const tw = typeWhereSql(slotType);
  const excludeList = usedIds.size > 0 ? [...usedIds] : ['00000000-0000-0000-0000-000000000000'];
  const placeholders = excludeList.map((_, i) => `$${i + 2}`).join(', ');

  const res = await client.query(
    `SELECT id FROM questions
     WHERE ${tw} AND id NOT IN (${placeholders})
     ORDER BY RANDOM()
     LIMIT ${n}`,
    [slotType, ...excludeList]
  );

  if (res.rows.length < n) {
    const fallback = await client.query(
      `SELECT id FROM questions WHERE ${tw} ORDER BY RANDOM() LIMIT ${n}`,
      [slotType]
    );
    return fallback.rows.map((r) => r.id);
  }
  return res.rows.map((r) => r.id);
}

/** Đề chuẩn 70 câu — cố định số lượng từng dạng */
async function buildSectionsStandard(client, usedIds) {
  const sections = { speaking: [], writing: [], reading: [], listening: [] };

  for (const slot of PTE_STANDARD_FIXED) {
    const ids = await pickQuestions(client, slot.type, slot.count, usedIds);
    ids.forEach((id) => usedIds.add(id));
    sections[slot.section].push(...ids);
  }

  return sections;
}

async function buildSectionsLegacyRandom(client, usedIds) {
  const sections = { speaking: [], writing: [], reading: [], listening: [] };

  for (const slot of LEGACY_TEMPLATE) {
    const n = randInt(slot.min, slot.max);
    const ids = await pickQuestions(client, slot.type, n, usedIds);
    ids.forEach((id) => usedIds.add(id));
    sections[slot.section].push(...ids);
  }

  return sections;
}

async function wipeMockData(client) {
  await client.query('DELETE FROM mock_test_attempts');
  await client.query('DELETE FROM mock_tests');
  console.log('🗑️  Đã xóa toàn bộ mock_test_attempts + mock_tests.\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = makeClient();
  await client.connect();

  const useStandard = !args.legacyRandom;

  if (args.replaceAll) {
    await wipeMockData(client);
  }

  console.log(`\n🎯 Tạo ${args.count} mock test — prefix "${args.prefix}"`);
  console.log(
    useStandard
      ? `   Template: tiêu chuẩn ${STANDARD_TOTAL} câu/bộ (Speaking 32 · Writing 3 · Reading 20 · Listening 15)`
      : '   Template: legacy (random min/max)\n'
  );

  const countRes = await client.query(`SELECT type, COUNT(*) as cnt FROM questions GROUP BY type ORDER BY type`);
  const available = {};
  for (const row of countRes.rows) available[row.type] = Number(row.cnt);

  const templateForCheck = useStandard ? PTE_STANDARD_FIXED : LEGACY_TEMPLATE;
  console.log('📊 Câu hỏi hiện có vs cần (chuẩn):');
  for (const slot of templateForCheck) {
    const cnt = available[slot.type] || 0;
    const needed = slot.count != null ? slot.count : slot.max;
    const ok = cnt >= needed ? '✓' : `⚠ cần ≥${needed}`;
    console.log(`   ${String(slot.type).padEnd(45)} ${String(cnt).padStart(4)} ${ok}`);
  }
  console.log('');

  const usedIds = new Set();
  const results = [];

  for (let i = 1; i <= args.count; i++) {
    const code = `${args.prefix}_${String(i).padStart(3, '0')}`;
    const title = `${args.prefix.replace(/_/g, ' ')} ${String(i).padStart(3, '0')}`;

    if (!args.force && !args.replaceAll) {
      const exists = await client.query('SELECT id FROM mock_tests WHERE code = $1', [code]);
      if (exists.rows.length > 0) {
        console.log(`⏭  ${code} đã tồn tại, bỏ qua (dùng --force hoặc --replace-all)`);
        continue;
      }
    }

    const sections = useStandard
      ? await buildSectionsStandard(client, usedIds)
      : await buildSectionsLegacyRandom(client, usedIds);

    const sp = sections.speaking.length;
    const wr = sections.writing.length;
    const re = sections.reading.length;
    const li = sections.listening.length;
    const total = sp + wr + re + li;

    await client.query(
      `INSERT INTO mock_tests (id, code, title, sections, "durationMinutes", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::jsonb, 180, true, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE
         SET sections = EXCLUDED.sections, title = EXCLUDED.title, "updatedAt" = NOW()`,
      [code, title, JSON.stringify(sections)]
    );

    results.push({ code, sp, wr, re, li, total });
    console.log(`✅ ${code} | speaking:${sp} writing:${wr} reading:${re} listening:${li} = ${total} câu`);
  }

  await client.end();

  console.log(`\n🏁 Hoàn thành! Đã tạo/cập nhật ${results.length}/${args.count} đề.`);
  if (results.length > 0) {
    console.log('\nKiểm tra: SELECT code, jsonb_array_length(sections->\'speaking\') AS sp FROM mock_tests ORDER BY code LIMIT 5;');
  }
}

main().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});

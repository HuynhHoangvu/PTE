/**
 * Tạo mock test ngẫu nhiên từ câu hỏi trong DB
 *
 * Sử dụng:
 *   node scripts/seed-mock-tests.js                          # tạo 5 đề, prefix MOCK
 *   node scripts/seed-mock-tests.js --count 8 --prefix FLY_RND  # 8 đề ngẫu nhiên, mã FLY_RND_001…
 *   node scripts/seed-mock-tests.js --prefix PTE --count 3   # code: PTE_001, PTE_002, ...
 *   node scripts/seed-mock-tests.js --force                  # overwrite nếu code đã tồn tại
 *
 * Env vars:
 *   DATABASE_URL  → Railway production URL
 *   (hoặc dùng DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE từ .env)
 */

const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── CLI args ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { count: 5, prefix: 'MOCK', force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--count'  && argv[i + 1]) out.count  = Number(argv[i + 1]);
    if (argv[i] === '--prefix' && argv[i + 1]) out.prefix = argv[i + 1];
    if (argv[i] === '--force')                  out.force  = true;
  }
  return out;
}

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Khớp backend questions.service: R&W FIB chỉ RWFIB*, Reading FIB chỉ RFIB* */
function typeWhereSql(type) {
  if (type === 'READING_FIB_R_W') return `type = $1 AND code ILIKE 'RWFIB%'`;
  if (type === 'READING_FIB_R') return `type = $1 AND code ILIKE 'RFIB%'`;
  return 'type = $1';
}

// ── PTE Format template ───────────────────────────────────────────────────────
// Số câu: random trong [min, max] cho mỗi dạng bài
const TEMPLATE = [
  // Speaking
  { type: 'SPEAKING_READ_ALOUD',               section: 'speaking',  min: 6,  max: 7  },
  { type: 'SPEAKING_REPEAT_SENTENCE',           section: 'speaking',  min: 10, max: 12 },
  { type: 'SPEAKING_DESCRIBE_IMAGE',            section: 'speaking',  min: 3,  max: 4  },
  { type: 'SPEAKING_RETELL_LECTURE',            section: 'speaking',  min: 1,  max: 2  },
  { type: 'SPEAKING_ANSWER_SHORT_QUESTION',     section: 'speaking',  min: 5,  max: 6  },
  { type: 'SPEAKING_RESPOND_TO_SITUATION',      section: 'speaking',  min: 2,  max: 3  },
  { type: 'SPEAKING_SUMMARISE_GROUP_DISCUSSION',section: 'speaking',  min: 1,  max: 2  },
  // Writing
  { type: 'WRITING_SUMMARIZE_WRITTEN_TEXT',     section: 'writing',   min: 1,  max: 2  },
  { type: 'WRITING_ESSAY',                      section: 'writing',   min: 1,  max: 2  },
  // Reading
  { type: 'READING_FIB_R_W',                   section: 'reading',   min: 5,  max: 6  },
  { type: 'READING_MCQ_MULTIPLE_ANSWER',        section: 'reading',   min: 1,  max: 2  },
  { type: 'READING_RE_ORDER_PARAGRAPH',         section: 'reading',   min: 2,  max: 3  },
  { type: 'READING_FIB_R',                      section: 'reading',   min: 4,  max: 5  },
  { type: 'READING_MCQ_SINGLE_ANSWER',          section: 'reading',   min: 1,  max: 2  },
  // Listening
  { type: 'LISTENING_SUMMARIZE_SPOKEN_TEXT',    section: 'listening', min: 1,  max: 2  },
  { type: 'LISTENING_MCQ_MULTIPLE_ANSWER',      section: 'listening', min: 1,  max: 2  },
  { type: 'LISTENING_FIB_L',                    section: 'listening', min: 2,  max: 3  },
  { type: 'LISTENING_HIGHLIGHT_CORRECT_SUMMARY',section: 'listening', min: 1,  max: 2  },
  { type: 'LISTENING_MCQ_SINGLE_ANSWER',        section: 'listening', min: 1,  max: 2  },
  { type: 'LISTENING_SELECT_MISSING_WORD',      section: 'listening', min: 1,  max: 2  },
  { type: 'LISTENING_HIGHLIGHT_INCORRECT_WORD', section: 'listening', min: 2,  max: 3  },
  { type: 'LISTENING_DICTATION',                section: 'listening', min: 3,  max: 4  },
];

// ── DB connection ─────────────────────────────────────────────────────────────
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
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'fly_edu',
  });
}

// ── Build one mock test ───────────────────────────────────────────────────────
async function buildSections(client, usedIds) {
  const sections = { speaking: [], writing: [], reading: [], listening: [] };

  for (const slot of TEMPLATE) {
    const n = randInt(slot.min, slot.max);

    // Exclude already-used IDs to keep tests distinct (best-effort)
    const excludeList = usedIds.size > 0 ? [...usedIds] : ['00000000-0000-0000-0000-000000000000'];
    const placeholders = excludeList.map((_, i) => `$${i + 2}`).join(', ');

    const tw = typeWhereSql(slot.type);
    const res = await client.query(
      `SELECT id FROM questions
       WHERE ${tw} AND id NOT IN (${placeholders})
       ORDER BY RANDOM()
       LIMIT ${n}`,
      [slot.type, ...excludeList]
    );

    if (res.rows.length === 0) {
      // Fallback: allow reuse if not enough questions
      const fallback = await client.query(
        `SELECT id FROM questions WHERE ${tw} ORDER BY RANDOM() LIMIT ${n}`,
        [slot.type]
      );
      res.rows.push(...fallback.rows);
    }

    const ids = res.rows.map(r => r.id);
    ids.forEach(id => usedIds.add(id));
    sections[slot.section].push(...ids);
  }

  return sections;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = makeClient();
  await client.connect();
  console.log(`\n🎯 Tạo ${args.count} mock test với prefix "${args.prefix}"\n`);

  // Check available question counts
  const countRes = await client.query(
    `SELECT type, COUNT(*) as cnt FROM questions GROUP BY type ORDER BY type`
  );
  const available = {};
  for (const row of countRes.rows) available[row.type] = Number(row.cnt);

  console.log('📊 Câu hỏi hiện có trong DB:');
  for (const slot of TEMPLATE) {
    const cnt = available[slot.type] || 0;
    const needed = slot.max;
    const ok = cnt >= needed ? '✓' : `⚠ cần ${needed}`;
    console.log(`   ${slot.type.padEnd(45)} ${String(cnt).padStart(4)} ${ok}`);
  }
  console.log('');

  const usedIds = new Set();
  const results = [];

  for (let i = 1; i <= args.count; i++) {
    const code = `${args.prefix}_${String(i).padStart(3, '0')}`;
    const title = `${args.prefix.replace(/_/g, ' ')} ${String(i).padStart(3, '0')}`;

    if (!args.force) {
      const exists = await client.query('SELECT id FROM mock_tests WHERE code = $1', [code]);
      if (exists.rows.length > 0) {
        console.log(`⏭  ${code} đã tồn tại, bỏ qua (dùng --force để overwrite)`);
        continue;
      }
    }

    const sections = await buildSections(client, usedIds);
    const sp = sections.speaking.length;
    const wr = sections.writing.length;
    const re = sections.reading.length;
    const li = sections.listening.length;
    const total = sp + wr + re + li;

    await client.query(
      `INSERT INTO mock_tests (id, code, title, sections, "durationMinutes", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::jsonb, 180, true, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE
         SET sections = EXCLUDED.sections, "updatedAt" = NOW()`,
      [code, title, JSON.stringify(sections)]
    );

    results.push({ code, sp, wr, re, li, total });
    console.log(`✅ ${code} | speaking:${sp} writing:${wr} reading:${re} listening:${li} = ${total} câu`);
  }

  await client.end();

  console.log(`\n🏁 Hoàn thành! Đã tạo ${results.length}/${args.count} đề.`);
  if (results.length > 0) {
    console.log('\nKiểm tra DB:');
    console.log(`  SELECT code, jsonb_array_length(sections->'speaking') FROM mock_tests ORDER BY code;`);
  }
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});

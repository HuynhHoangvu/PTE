/* eslint-disable no-console */
/**
 * SGD Backfill: Dùng Gemini 2.5 Flash nghe audio group discussion → sinh suggestedAnswer.
 *
 * SGD yêu cầu học viên tóm tắt toàn bộ cuộc thảo luận (~60 giây nói).
 * Script này tải audio, gửi lên Gemini, lấy về một đoạn tóm tắt mẫu (~80-100 từ).
 *
 * Cách dùng:
 *   node scripts/backfill-sgd-suggested.js              # chỉ câu chưa có suggestedAnswer
 *   node scripts/backfill-sgd-suggested.js --force      # ghi đè cả câu đã có
 *   node scripts/backfill-sgd-suggested.js --limit 20
 *   node scripts/backfill-sgd-suggested.js --dry-run    # in ra, không lưu DB
 */

const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── CLI args ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { force: false, dryRun: false, limit: 9999 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") out.force = true;
    else if (argv[i] === "--dry-run") out.dryRun = true;
    else if (argv[i] === "--limit") {
      out.limit = parseInt(argv[i + 1] || "50", 10);
      i++;
    }
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌  Thiếu GEMINI_API_KEY trong .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFromUrl(url) {
  const ext = path.extname(url.split("?")[0]).toLowerCase();
  const map = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
  };
  return map[ext] || "audio/mpeg";
}

async function fetchAudioAsBase64(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Không tải được audio: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buf).toString("base64"),
      mimeType: mimeFromUrl(url),
    },
  };
}

async function generateSuggestedAnswer(audioUrl, code) {
  const audioPart = await fetchAudioAsBase64(audioUrl);

  const prompt = `You are a PTE Academic speaking expert.

Listen to this audio recording of a group discussion (PTE task code: ${code}).

Your job:
1. Understand what the discussion is about.
2. Write a sample spoken response (~80-100 words) that a student could say to summarize the WHOLE discussion — covering the main topic, key points raised by participants, and a brief conclusion.
3. The response should be in natural spoken English, fluent, and clear.

Return ONLY the sample answer text. No labels, no JSON, no markdown.`;

  const result = await model.generateContent([prompt, audioPart]);
  const text = result.response.text().trim();
  if (!text || text.length < 30) throw new Error("Gemini trả về kết quả rỗng/quá ngắn");
  return text;
}

async function main() {
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await db.connect();

  let sql = `
    SELECT id, code, "audioUrl"
    FROM questions
    WHERE type = 'SPEAKING_SUMMARISE_GROUP_DISCUSSION'
      AND "audioUrl" IS NOT NULL
      AND TRIM("audioUrl") <> ''
  `;
  if (!opts.force) {
    sql += ` AND ("suggestedAnswer" IS NULL OR TRIM("suggestedAnswer") = '')`;
  }
  sql += ` ORDER BY code ASC LIMIT ${opts.limit}`;

  const { rows } = await db.query(sql);
  console.log(`\nTìm thấy ${rows.length} câu SGD cần xử lý.\n`);

  if (rows.length === 0) {
    console.log("Không có câu nào cần backfill. Dùng --force để ghi đè.");
    await db.end();
    return;
  }

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    console.log(`[${i + 1}/${rows.length}] ${q.code}`);

    try {
      const suggestion = await generateSuggestedAnswer(q.audioUrl, q.code);
      console.log(`\x1b[36m  → ${suggestion.substring(0, 100)}...\x1b[0m`);

      if (!opts.dryRun) {
        await db.query(
          `UPDATE questions SET "suggestedAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [suggestion, q.id]
        );
        console.log(`  \x1b[32m✓ Đã lưu DB\x1b[0m`);
        updated++;
      } else {
        console.log(`  [dry-run] Bỏ qua lưu DB`);
        updated++;
      }
    } catch (err) {
      console.error(`  \x1b[31m❌ Lỗi: ${err.message}\x1b[0m`);
      errors++;
    }

    // Tránh rate limit Gemini
    await sleep(1500);
  }

  await db.end();
  console.log(`\n✅ Hoàn tất! Cập nhật: ${updated}, Lỗi: ${errors}`);
}

main().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});

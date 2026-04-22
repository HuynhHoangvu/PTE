/* eslint-disable no-console */
/**
 * SMW Backfill: Dung Gemini de xac dinh dap an dung cho LISTENING_SELECT_MISSING_WORD.
 * Transcribe audio bang Whisper, sau do Gemini chon option nao hoan chinh lecture hop ly nhat.
 * Usage:
 *   node scripts/backfill-smw-answers.js              -- chi xu ly chua co answer
 *   node scripts/backfill-smw-answers.js --force       -- ghi de tat ca
 *   node scripts/backfill-smw-answers.js --dry-run     -- xem ket qua, KHONG ghi DB
 *   node scripts/backfill-smw-answers.js --code SMW0001
 */

const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PYTHON_SCORER_URL = (process.env.PYTHON_SCORER_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const CODE_FILTER = (() => { const i = process.argv.indexOf("--code"); return i >= 0 ? process.argv[i + 1] : null; })();
const FROM_CODE = (() => { const i = process.argv.indexOf("--from"); return i >= 0 ? process.argv[i + 1] : null; })();

async function transcribeAudio(buf, mime) {
  const res = await fetch(`${PYTHON_SCORER_URL}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_base64: buf.toString("base64"), audio_mime: mime }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await res.json();
  return (data.text || data.transcription || "").trim();
}

async function fetchAudioWithSizeCheck(url) {
  // HEAD request để check size trước
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    const size = parseInt(head.headers.get("content-length") || "0");
    const MAX_MB = 15;
    if (size > MAX_MB * 1024 * 1024) throw new Error(`Audio too large: ${(size/1024/1024).toFixed(1)}MB > ${MAX_MB}MB`);
  } catch (e) {
    if (e.message.startsWith("Audio too large")) throw e;
    // Ignore HEAD errors, try download anyway
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  return Buffer.from(await res.arrayBuffer());
}

async function pickViaGemini(transcript, content, options) {
  const res = await fetch(`${PYTHON_SCORER_URL}/smw-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, content, options }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.answer || "").trim().toUpperCase() || null;
}

async function withRetry(fn, retries = 2, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries - 1) throw e;
      console.warn(`  Retry ${i + 1} after: ${e.message}`);
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT id, code, "audioUrl", content, options, "correctAnswer"
    FROM questions
    WHERE type = 'LISTENING_SELECT_MISSING_WORD'
    ORDER BY code
  `);

  let toProcess = CODE_FILTER
    ? rows.filter(r => r.code === CODE_FILTER)
    : FORCE
      ? FROM_CODE ? rows.filter(r => r.code >= FROM_CODE) : rows
      : rows.filter(r => !r.correctAnswer);

  if (DRY_RUN) console.log("⚠️  DRY-RUN mode — khong ghi vao DB\n");
  console.log(`Found ${rows.length} SMW questions, processing ${toProcess.length} (force=${FORCE}, dry-run=${DRY_RUN})\n`);

  let ok = 0, fail = 0;

  for (const row of toProcess) {
    try {
      console.log(`Processing ${row.code}...`);
      const options = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;

      const buf = await withRetry(() => fetchAudioWithSizeCheck(row.audioUrl));
      const transcript = await withRetry(() => transcribeAudio(buf, 'audio/mpeg'));

      if (!transcript) {
        console.warn(`  SKIP ${row.code}: empty transcript`);
        continue;
      }

      const answer = await withRetry(() => pickViaGemini(transcript, row.content || "", options));

      if (!answer || !options.find(o => o.label === answer)) {
        console.warn(`  WARN ${row.code}: invalid answer "${answer}" from Gemini`);
        fail++;
        continue;
      }

      const chosenOption = options.find(o => o.label === answer);
      console.log(`  Transcript: "${transcript.slice(0, 100)}..."`);
      console.log(`  Answer: ${answer} → "${chosenOption.text}"`);

      if (DRY_RUN) { console.log(`  [DRY-RUN] Bo qua ghi DB`); ok++; continue; }

      await client.query(
        `UPDATE questions SET "correctAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(answer), row.id]
      );
      console.log(`  Saved.`);
      ok++;
    } catch (e) {
      console.error(`  ERR ${row.code}: ${e.message}`);
      fail++;
    }
  }

  await client.end();
  console.log(`\nDone: ${ok} updated, ${fail} failed`);
}

main().catch(console.error);

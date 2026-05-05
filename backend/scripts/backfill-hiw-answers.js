/* eslint-disable no-console */
/**
 * HIW Backfill: Whisper (/transcribe) -> so sanh voi content -> python-scorer /find-incorrect-words
 * (mac dinh canh tu bang difflib; Gemini chi khi diff rong hoac HIW_FIND_WORDS_USE_GEMINI=1 tren scorer).
 * Usage:
 *   node scripts/backfill-hiw-answers.js              -- chi xu ly chua co answer
 *   node scripts/backfill-hiw-answers.js --force       -- ghi de tat ca
 *   node scripts/backfill-hiw-answers.js --dry-run     -- xem ket qua, KHONG ghi DB
 *   node scripts/backfill-hiw-answers.js --code HIW0001 -- chi xu ly 1 cau cu the
 *   node scripts/backfill-hiw-answers.js --code HIW0002 --force  -- ghi de dap an 1 cau (can python-scorer + /transcribe + /find-incorrect-words)
 *   node scripts/backfill-hiw-answers.js --force --strategy gemini  -- chi Gemini (bai tricky; can GEMINI key)
 *   --strategy: auto | gemini | flat | sentence | merged (API python-scorer /find-incorrect-words)
 *
 * Chuẩn đáp án tay (ưu tiên khi backfill): scripts/hiw-gold-overrides.json — đúng chính tả trên passage.
 */

const path = require("path");
const fs = require("fs");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function loadGoldOverrides() {
  const p = path.join(__dirname, "hiw-gold-overrides.json");
  if (!fs.existsSync(p)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!/^HIW\d+$/i.test(k)) continue;
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) continue;
      out[k.toUpperCase()] = v;
    }
    return out;
  } catch (e) {
    console.warn("Khong doc duoc hiw-gold-overrides.json:", e.message);
    return {};
  }
}

const PYTHON_SCORER_URL = (process.env.PYTHON_SCORER_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const CODE_FILTER = (() => { const i = process.argv.indexOf("--code"); return i >= 0 ? process.argv[i + 1] : null; })();
const FROM_CODE = (() => { const i = process.argv.indexOf("--from"); return i >= 0 ? process.argv[i + 1] : null; })();
const STRATEGY = (() => {
  const i = process.argv.indexOf("--strategy");
  return i >= 0 ? process.argv[i + 1] : "auto";
})();

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

async function findIncorrectWords(content, transcript, strategy = "auto") {
  const res = await fetch(`${PYTHON_SCORER_URL}/find-incorrect-words`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, transcript, strategy }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.incorrect_words || [];
}

async function fetchAudioBytes(url) {
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    const size = parseInt(head.headers.get("content-length") || "0");
    if (size > 15 * 1024 * 1024) throw new Error(`Audio too large: ${(size/1024/1024).toFixed(1)}MB`);
  } catch (e) {
    if (e.message.startsWith("Audio too large")) throw e;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  return Buffer.from(await res.arrayBuffer());
}

async function withRetry(fn, retries = 2, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.warn(`  Retry ${i + 1}/${retries - 1} after error: ${e.message}`);
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
    SELECT id, code, "audioUrl", "content", "correctAnswer"
    FROM questions
    WHERE type = 'LISTENING_HIGHLIGHT_INCORRECT_WORD'
    ORDER BY code
  `);

  let toProcess = CODE_FILTER
    ? rows.filter(r => r.code === CODE_FILTER)
    : FORCE
      ? FROM_CODE ? rows.filter(r => r.code >= FROM_CODE) : rows
      : rows.filter(r => {
          try {
            const ca = typeof r.correctAnswer === 'string' ? JSON.parse(r.correctAnswer) : r.correctAnswer;
            return !ca || !Array.isArray(ca) || ca.length === 0;
          } catch { return true; }
        });

  if (DRY_RUN) console.log("⚠️  DRY-RUN mode — khong ghi vao DB\n");
  console.log(`Found ${rows.length} HIW questions, processing ${toProcess.length} (force=${FORCE}, dry-run=${DRY_RUN}, strategy=${STRATEGY})\n`);

  const goldOverrides = loadGoldOverrides();
  if (Object.keys(goldOverrides).length) {
    console.log(`Gold overrides: ${Object.keys(goldOverrides).join(", ")}\n`);
  }

  let ok = 0, fail = 0;

  for (const row of toProcess) {
    try {
      console.log(`Processing ${row.code}...`);

      const codeKey = String(row.code || "").toUpperCase();
      let incorrectWords = goldOverrides[codeKey];
      if (Array.isArray(incorrectWords) && incorrectWords.length) {
        console.log(`  Source: hiw-gold-overrides.json (${incorrectWords.length} words)`);
        console.log(`  Words: [${incorrectWords.join(", ")}]`);
      } else {
        const buf = await withRetry(() => fetchAudioBytes(row.audioUrl));
        const transcript = await withRetry(() => transcribeAudio(buf, "audio/mpeg"));

        if (!transcript) {
          console.warn(`  SKIP ${row.code}: empty transcript`);
          continue;
        }

        incorrectWords = await withRetry(() => findIncorrectWords(row.content, transcript, STRATEGY));

        console.log(`  Transcript: "${transcript.slice(0, 120)}..."`);
        console.log(`  Words (${incorrectWords.length}): [${incorrectWords.join(", ")}]`);
      }

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Bo qua ghi DB`);
        ok++;
        continue;
      }

      await client.query(
        `UPDATE questions SET "correctAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(incorrectWords), row.id]
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

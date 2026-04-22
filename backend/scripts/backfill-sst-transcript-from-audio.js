/* eslint-disable no-console */
/**
 * SST Backfill:
 *   1) Dung Whisper de tao transcript tu audioUrl -> correctAnswer.transcript
 *   2) Dung Gemini de tao suggestedAnswer (keywords) tu transcript
 *
 * Flags:
 *   --force           Re-transcribe ca nhung cau da co transcript
 *   --suggest         Chi generate suggestedAnswer (keyword), bo qua buoc transcribe
 *   --force-suggest   Overwrite suggestedAnswer du da co
 *   --limit N         Chi xu ly N cau
 *   --dry-run         Khong ghi DB, chi in ra
 */

const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PYTHON_SCORER_URL = (process.env.PYTHON_SCORER_URL || "http://127.0.0.1:8001").replace(/\/$/, "");

function mimeFromUrlOrPath(u) {
  const ext = path.extname(u.split("?")[0]).toLowerCase();
  const map = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webm": "audio/webm", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };
  return map[ext] || "audio/mpeg";
}

async function transcribeBuffer(buf, mime) {
  const res = await fetch(`${PYTHON_SCORER_URL}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_base64: buf.toString("base64"), audio_mime: mime }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.transcription || "").trim();
}

async function fetchAudioBytes(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateKeywords(transcript, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${PYTHON_SCORER_URL}/generate-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const data = await res.json();
      return (data.keywords || "").trim();
    } catch (e) {
      if (attempt === retries) throw e;
      console.warn(`  Retry ${attempt}/${retries - 1}...`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function parseArgs(argv) {
  const out = { dryRun: false, force: false, suggest: false, forceSuggest: false, limit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--suggest") out.suggest = true;
    else if (a === "--force-suggest") { out.suggest = true; out.forceSuggest = true; }
    else if (a === "--limit") { out.limit = Number(argv[i + 1]); i += 1; }
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // ── Buoc 1: Transcribe ────────────────────────────────────────────────────
  if (!opts.suggest) {
    let sql = `
      SELECT id, code, "audioUrl", "correctAnswer"
      FROM questions
      WHERE type = 'LISTENING_SUMMARIZE_SPOKEN_TEXT'
        AND "audioUrl" IS NOT NULL
        AND TRIM("audioUrl") <> ''
    `;
    if (!opts.force) {
      sql += ` AND ("correctAnswer" IS NULL OR "correctAnswer"->>'transcript' IS NULL OR "correctAnswer"->>'transcript' = '')`;
    }
    sql += ` ORDER BY code`;
    if (opts.limit) sql += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(sql);
    console.log(`[TRANSCRIBE] ${rows.length} cau can xu ly...\n`);

    for (const row of rows) {
      const { id, code, audioUrl } = row;
      let buf;
      try {
        buf = await fetchAudioBytes(audioUrl.trim());
      } catch (e) {
        console.error(`[ERR] ${code} download:`, e.message);
        errors += 1;
        continue;
      }

      const mime = mimeFromUrlOrPath(audioUrl);
      let text;
      try {
        console.log(`Transcribing ${code}...`);
        text = await transcribeBuffer(buf, mime);
      } catch (e) {
        console.error(`[ERR] ${code} transcribe:`, e.message);
        errors += 1;
        continue;
      }

      if (!text) {
        console.warn(`Trong transcript: ${code}`);
        errors += 1;
        continue;
      }

      if (opts.dryRun) {
        console.log(`[dry-run] ${code}: "${text.substring(0, 60)}..."`);
        updated += 1;
        continue;
      }

      const newCorrectAnswer = row.correctAnswer || {};
      newCorrectAnswer.transcript = text;
      await client.query(
        `UPDATE questions SET "correctAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(newCorrectAnswer), id]
      );
      console.log(`OK ${code}: transcript ${text.split(" ").length} words`);
      updated += 1;
    }
    console.log(`\n[TRANSCRIBE] Xong. Updated: ${updated}, loi: ${errors}\n`);
    updated = 0; errors = 0;
  }

  // ── Buoc 2: Generate suggested keywords ──────────────────────────────────
  if (opts.suggest) {
    let sql = `
      SELECT id, code, "correctAnswer", "suggestedAnswer"
      FROM questions
      WHERE type = 'LISTENING_SUMMARIZE_SPOKEN_TEXT'
        AND "correctAnswer"->>'transcript' IS NOT NULL
        AND "correctAnswer"->>'transcript' <> ''
    `;
    if (!opts.forceSuggest) {
      sql += ` AND ("suggestedAnswer" IS NULL OR TRIM("suggestedAnswer"::text) = '' OR TRIM("suggestedAnswer"::text) = '""')`;
    }
    sql += ` ORDER BY code`;
    if (opts.limit) sql += ` LIMIT ${opts.limit}`;

    const { rows } = await client.query(sql);
    console.log(`[SUGGEST] ${rows.length} cau can generate keywords...\n`);

    for (const row of rows) {
      const { id, code } = row;
      const transcript = row.correctAnswer?.transcript || "";
      if (!transcript) { skipped += 1; continue; }

      let keywords;
      try {
        console.log(`Generating keywords for ${code}...`);
        keywords = await generateKeywords(transcript);
      } catch (e) {
        console.error(`[ERR] ${code} gemini:`, e.message);
        errors += 1;
        continue;
      }

      if (!keywords) { skipped += 1; continue; }

      if (opts.dryRun) {
        console.log(`[dry-run] ${code}: ${keywords.substring(0, 80)}`);
        updated += 1;
        continue;
      }

      await client.query(
        `UPDATE questions SET "suggestedAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [keywords, id]
      );
      console.log(`OK ${code}: ${keywords.substring(0, 80)}`);
      updated += 1;
    }
    console.log(`\n[SUGGEST] Xong. Updated: ${updated}, bo qua: ${skipped}, loi: ${errors}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

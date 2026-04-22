/* eslint-disable no-console */
/**
 * Generic Listening Backfill: Su dung Whisper (python-scorer) de tao transcript cho nhieu loai cau hoi Listening.
 * Su dung:
 *   node scripts/backfill-listening-transcript.js --type LISTENING_SELECT_MISSING_WORD
 *   node scripts/backfill-listening-transcript.js --type LISTENING_MCQ_MULTIPLE_ANSWER
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PYTHON_SCORER_URL = (process.env.PYTHON_SCORER_URL || "http://127.0.0.1:8001").replace(
  /\/$/,
  ""
);

function mimeFromUrlOrPath(u) {
  const ext = path.extname(u.split("?")[0]).toLowerCase();
  const map = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
  };
  return map[ext] || "audio/mpeg";
}

async function transcribeBuffer(buf, mime) {
  const res = await fetch(`${PYTHON_SCORER_URL}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_base64: buf.toString("base64"),
      audio_mime: mime,
    }),
    signal: AbortSignal.timeout(180000), 
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  const data = await res.json();
  return (data.transcription || "").trim();
}

async function fetchAudioBytes(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function parseArgs(argv) {
  const out = { dryRun: false, force: false, limit: null, type: 'LISTENING_SELECT_MISSING_WORD' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--limit") {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--type") {
      out.type = argv[i + 1];
      i += 1;
    }
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
  let errors = 0;

  let sql = `
    SELECT id, code, "audioUrl", "correctAnswer"
    FROM questions
    WHERE type = $1
      AND "audioUrl" IS NOT NULL
      AND TRIM("audioUrl") <> ''
  `;

  if (!opts.force) {
    sql += ` AND ( "correctAnswer" IS NULL OR "correctAnswer"->>'transcript' IS NULL OR "correctAnswer"->>'transcript' = '' )`;
  }

  sql += ` ORDER BY code`;
  if (opts.limit) sql += ` LIMIT ${opts.limit}`;

  const { rows } = await client.query(sql, [opts.type]);
  console.log(`Dang backfill transcript cho ${rows.length} cau loai [${opts.type}]...\n`);

  for (const row of rows) {
    const { id, code, audioUrl } = row;
    try {
      const buf = await fetchAudioBytes(audioUrl.trim());
      const mime = mimeFromUrlOrPath(audioUrl);
      
      console.log(`Transcribing ${code}...`);
      const text = await transcribeBuffer(buf, mime);

      if (!text) {
        console.warn(`Trong transcript: ${code}`);
        continue;
      }

      if (opts.dryRun) {
        console.log(`[dry-run] ${code}: "${text.substring(0, 50)}..."`);
        updated += 1;
        continue;
      }

      const newCorrectAnswer = row.correctAnswer || {};
      newCorrectAnswer.transcript = text;

      await client.query(
        `UPDATE questions SET "correctAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(newCorrectAnswer), id]
      );

      console.log(`OK ${code}: Da tao transcript`);
      updated += 1;
    } catch (e) {
      console.error(`[ERR] ${code}:`, e.message);
      errors += 1;
    }
  }

  await client.end();
  console.log(`\nXong. Cap nhat: ${updated}, loi: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Batch: lấy transcript (đáp án tham chiếu EN) từ file âm thanh gốc, ghi vào suggestedAnswer.
 *
 * Cần python-scorer đang chạy (Whisper), PYTHON_SCORER_URL trong .env (mặc định http://127.0.0.1:8001).
 *
 * Cách dùng:
 *   1) Từ DB — mọi câu RS có audioUrl mà chưa có suggestedAnswer:
 *      node scripts/backfill-rs-suggested-from-audio.js
 *
 *   2) Ghi đè cả khi đã có suggestedAnswer:
 *      node scripts/backfill-rs-suggested-from-audio.js --force
 *
 *   3) Chỉ tối đa N câu:
 *      node scripts/backfill-rs-suggested-from-audio.js --limit 20
 *
 *   4) Thử nghiệm không ghi DB:
 *      node scripts/backfill-rs-suggested-from-audio.js --dry-run
 *
 *   5) Thư mục file local — tên file chứa mã RS, ví dụ RS0004.mp3, repeat_RS0004.wav:
 *      node scripts/backfill-rs-suggested-from-audio.js --folder "D:\\path\\to\\audios"
 */

/* eslint-disable no-console */
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
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  const data = await res.json();
  return (data.transcription || "").trim();
}

async function fetchAudioBytes(url) {
  if (url.startsWith("file://")) {
    const p = url.replace(/^file:\/\//, "");
    return fs.readFileSync(p);
  }
  if (/^[a-zA-Z]:\\/.test(url) || url.startsWith("\\\\")) {
    return fs.readFileSync(url);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function parseArgs(argv) {
  const out = { dryRun: false, force: false, limit: null, folder: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--limit") {
      out.limit = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--folder") {
      out.folder = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

function extractRsCode(filename) {
  const base = path.basename(filename, path.extname(filename));
  const m = base.match(/(RS\d{3,})/i);
  return m ? m[1].toUpperCase() : null;
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

  if (opts.folder) {
    const dir = path.resolve(opts.folder);
    if (!fs.existsSync(dir)) {
      console.error("Khong tim thay folder:", dir);
      process.exit(1);
    }
    const files = fs.readdirSync(dir).filter((f) => /\.(mp3|wav|webm|m4a|ogg)$/i.test(f));
    console.log(`Tim thay ${files.length} file trong ${dir}\n`);

    for (const name of files) {
      const code = extractRsCode(name);
      if (!code) {
        console.warn(`Bo qua (khong parse duoc ma RS): ${name}`);
        skipped += 1;
        continue;
      }
      const full = path.join(dir, name);
      const buf = fs.readFileSync(full);
      const mime = mimeFromUrlOrPath(full);
      let text;
      try {
        text = await transcribeBuffer(buf, mime);
      } catch (e) {
        console.error(`[ERR] ${code} ${name}:`, e.message);
        errors += 1;
        continue;
      }
      if (!text) {
        console.warn(`Trong transcript: ${code} (${name})`);
        errors += 1;
        continue;
      }

      const r = await client.query(
        `SELECT id, code, "suggestedAnswer" FROM questions WHERE code = $1 AND type = 'SPEAKING_REPEAT_SENTENCE'`,
        [code]
      );
      if (r.rows.length === 0) {
        console.warn(`Khong co cau ${code} trong DB`);
        skipped += 1;
        continue;
      }
      const row = r.rows[0];
      if (row.suggestedAnswer && !opts.force) {
        console.log(`Bo qua ${code} (da co suggestedAnswer, dung --force de ghi de)`);
        skipped += 1;
        continue;
      }
      if (opts.dryRun) {
        console.log(`[dry-run] ${code} <- "${text}"`);
        updated += 1;
        continue;
      }
      await client.query(`UPDATE questions SET "suggestedAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`, [
        text,
        row.id,
      ]);
      console.log(`OK ${code}: "${text}"`);
      updated += 1;
    }
  } else {
    let sql = `
      SELECT id, code, "audioUrl", "suggestedAnswer"
      FROM questions
      WHERE type = 'SPEAKING_REPEAT_SENTENCE'
        AND "audioUrl" IS NOT NULL
        AND TRIM("audioUrl") <> ''
    `;
    if (!opts.force) {
      sql += ` AND ("suggestedAnswer" IS NULL OR TRIM("suggestedAnswer") = '')`;
    }
    sql += ` ORDER BY code`;
    if (opts.limit && Number.isFinite(opts.limit)) {
      sql += ` LIMIT ${Math.max(1, Math.floor(opts.limit))}`;
    }

    const { rows } = await client.query(sql);
    console.log(`Dang xu ly ${rows.length} cau (PYTHON_SCORER_URL=${PYTHON_SCORER_URL})\n`);

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
        console.log(`[dry-run] ${code}: "${text}"`);
        updated += 1;
        continue;
      }
      await client.query(`UPDATE questions SET "suggestedAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`, [
        text,
        id,
      ]);
      console.log(`OK ${code}: "${text}"`);
      updated += 1;
    }
  }

  await client.end();
  console.log(`\nXong. Cap nhat: ${updated}, bo qua: ${skipped}, loi: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

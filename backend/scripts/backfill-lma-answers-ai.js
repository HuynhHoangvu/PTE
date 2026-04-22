/* eslint-disable no-console */
/**
 * Backfill correctAnswer + title cho LISTENING_MCQ_MULTIPLE_ANSWER
 * dung Gemini 2.5 Flash nghe audio va chon dap an dung.
 *
 * Su dung:
 *   node scripts/backfill-lma-answers-ai.js            # xu ly nhung cau chua co answer
 *   node scripts/backfill-lma-answers-ai.js --force    # xu ly lai tat ca
 *   node scripts/backfill-lma-answers-ai.js --limit 20
 *   node scripts/backfill-lma-answers-ai.js --dry-run  # chi in, khong ghi DB
 */

const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

// ── Parse CLI args ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { force: false, dryRun: false, limit: 500 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") out.force = true;
    if (argv[i] === "--dry-run") out.dryRun = true;
    if (argv[i] === "--limit" && argv[i + 1]) out.limit = Number(argv[i + 1]);
  }
  return out;
}

// ── Download audio sang base64 ────────────────────────────────────────────────
async function fetchAudioBase64(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

function mimeFromUrl(url) {
  const ext = path.extname(url.split("?")[0]).toLowerCase();
  const map = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webm": "audio/webm", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };
  return map[ext] || "audio/mpeg";
}

// ── Gemini nghe audio + chon dap an ──────────────────────────────────────────
async function solveWithAudio(question, audioBase64, mimeType) {
  const optionsStr = (question.options || [])
    .map((o) => `${o.label}: ${o.text}`)
    .join("\n");

  const prompt = `You are a PTE Academic expert grader.

A student is listening to an audio recording. After listening, they must select ALL correct answers from the multiple choice options below.

QUESTION: ${question.title && !["need help?", "need help", "help"].includes(question.title.toLowerCase())
    ? question.title
    : "Listen to the recording and select all correct responses."}

OPTIONS:
${optionsStr}

Listen carefully to the audio and determine which options are correct based on what is mentioned or implied in the recording.

Return a JSON object with:
- "answers": array of correct option labels (e.g. ["A", "C"])
- "question": a concise question text derived from the audio (e.g. "Which TWO factors does the speaker mention about...?")
- "confidence": "high" | "medium" | "low"

Example: { "answers": ["A", "C"], "question": "Which factors does the speaker say contribute to climate change?", "confidence": "high" }`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    },
    { text: prompt },
  ]);

  const text = result.response.text().trim();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) data = JSON.parse(match[0]);
    else throw new Error("No JSON in response: " + text.slice(0, 200));
  }

  if (!Array.isArray(data.answers) || data.answers.length === 0) {
    throw new Error("Invalid answers array: " + JSON.stringify(data));
  }

  return data;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("Args:", args);

  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await db.connect();

  // Chi lay cau co audioUrl thuc su
  const whereExtra = args.force
    ? ""
    : `AND ("correctAnswer" IS NULL OR jsonb_typeof("correctAnswer") != 'array')`;

  const { rows } = await db.query(`
    SELECT id, code, title, options, "audioUrl", "correctAnswer"
    FROM questions
    WHERE type = 'LISTENING_MCQ_MULTIPLE_ANSWER'
      AND "audioUrl" IS NOT NULL
      AND "audioUrl" != ''
      ${whereExtra}
    ORDER BY code
    LIMIT $1
  `, [args.limit]);

  console.log(`\nTim thay ${rows.length} cau can xu ly.\n`);

  let ok = 0, fail = 0, skip = 0;

  for (const row of rows) {
    process.stdout.write(`[${ok + fail + skip + 1}/${rows.length}] ${row.code} ... `);

    try {
      const mimeType = mimeFromUrl(row.audioUrl);
      const audioBase64 = await fetchAudioBase64(row.audioUrl);

      const result = await solveWithAudio(row, audioBase64, mimeType);

      console.log(`answers=${JSON.stringify(result.answers)} | conf=${result.confidence}`);
      if (result.question) console.log(`  -> question: ${result.question}`);

      if (!args.dryRun) {
        await db.query(
          `UPDATE questions
           SET "correctAnswer" = $1,
               title           = COALESCE(NULLIF(title, ''), NULLIF($2, ''), title),
               "updatedAt"     = NOW()
           WHERE id = $3`,
          [JSON.stringify(result.answers), result.question || null, row.id]
        );
      }

      ok++;
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      fail++;
    }

    // Tranh rate limit Gemini
    await new Promise((r) => setTimeout(r, 2000));
  }

  await db.end();
  console.log(`\nHoan tat. OK: ${ok} | Fail: ${fail} | Skip: ${skip}`);
}

main().catch(console.error);

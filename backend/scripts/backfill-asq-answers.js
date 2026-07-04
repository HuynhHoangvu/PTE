/* eslint-disable no-console */
/**
 * Backfill correctAnswer cho SPEAKING_ANSWER_SHORT_QUESTION
 *
 * 3 loai du lieu hien tai:
 *  A) correctAnswer = "astronomer"            (string cu)  → convert sang array + them bien the
 *  B) correctAnswer = {"transcript":"...?"}   (co cau hoi) → Gemini text-only de lay dap an
 *  C) correctAnswer = null                    (khong co gi) → Gemini nghe audio → cau hoi + dap an
 *
 * Ket qua luu: correctAnswer = ["answer1", "answer2", ...]  (JSON array)
 *
 * Su dung:
 *   node scripts/backfill-asq-answers.js              # chi cau chua co array answer
 *   node scripts/backfill-asq-answers.js --force      # xu ly lai tat ca
 *   node scripts/backfill-asq-answers.js --limit 20
 *   node scripts/backfill-asq-answers.js --dry-run
 */

const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

// ── CLI args ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { force: false, dryRun: false, limit: 500 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force")              out.force  = true;
    if (argv[i] === "--dry-run")            out.dryRun = true;
    if (argv[i] === "--limit" && argv[i+1]) out.limit  = Number(argv[i+1]);
  }
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Normalize answer strings ──────────────────────────────────────────────────
function normalizeAnswers(arr) {
  return arr
    .map(a => String(a).toLowerCase().trim().replace(/[^\w\s]/g, "").trim())
    .filter(Boolean);
}

// ── Fetch with retry ──────────────────────────────────────────────────────────
async function fetchWithRetry(url, retries = 3, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  [retry ${i+1}] ${e.message}`);
      await sleep(delayMs);
    }
  }
}

async function fetchAudioBase64(url) {
  const res = await fetchWithRetry(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

function mimeFromUrl(url) {
  const ext = path.extname((url || "").split("?")[0]).toLowerCase();
  const map = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webm": "audio/webm", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };
  return map[ext] || "audio/mpeg";
}

// ── CASE A: String answer da co → wrap sang array (khong can goi AI)
// Python scorer da normalize (bo articles a/an/the) nen chi can keyword chinh.
function wrapStringToArray(existingAnswer) {
  const normalized = existingAnswer.toLowerCase().trim().replace(/[^\w\s]/g, "").trim();
  if (!normalized) return [existingAnswer.toLowerCase().trim()];
  return [normalized];
}

// ── CASE B: Co cau hoi text → Gemini text-only → dap an chinh xac ───────────
async function answerFromText(questionText) {
  const prompt = `You are a PTE Academic expert grading system.

PTE "Answer Short Question". The question is:
"${questionText}"

Give the SPECIFIC correct answer keyword(s) for this question.
- Be precise: only the exact term/word being asked for
- Maximum 3 variations of the SAME answer (with/without article, singular/plural)
- Do NOT list general or loosely related words

Return ONLY valid JSON:
{
  "answers": ["specific_answer", "variation"],
  "confidence": "high"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  let data;
  try { data = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) data = JSON.parse(m[0]); else throw new Error("No JSON: " + text.slice(0,200)); }
  if (!data?.answers?.length) throw new Error("Empty answers: " + JSON.stringify(data));
  return { answers: normalizeAnswers(data.answers).slice(0, 4), confidence: data.confidence || "?" };
}

// ── CASE C / Force: Gemini nghe audio → cau hoi + dap an chinh xac ──────────
async function answerFromAudio(audioBase64, mimeType) {
  const prompt = `You are a PTE Academic expert grading system.

This audio is a PTE "Answer Short Question". The student hears the question and must answer in 1-3 words.

Your task:
1. Transcribe the exact question from the audio
2. Provide the CORRECT answer keywords - ONLY words that directly answer the question
   - Be specific: if the question asks for a specific term/role/object, give THAT term
   - Do NOT list general related words or categories
   - Maximum 3 variations (e.g., with/without article, singular/plural of the SAME word)
   - Each answer: 1-3 words only

BAD example (too vague): question="What tool is used to lift heavy boxes?" answers=["forklift","crane","truck","machine","tool"]
GOOD example: question="What tool is used to lift heavy boxes?" answers=["forklift","a forklift","forklifts"]

BAD example: question="What do we call a city that governs a country?" answers=["city","place","location","government city"]
GOOD example: question="What do we call a city that governs a country?" answers=["capital","capital city"]

Return ONLY valid JSON:
{
  "question": "exact question from audio",
  "answers": ["most_specific_answer", "variation2"],
  "confidence": "high"
}`;

  const result = await model.generateContent([
    { inlineData: { mimeType, data: audioBase64 } },
    { text: prompt },
  ]);
  const text = result.response.text().trim();
  let data;
  try { data = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); if (m) data = JSON.parse(m[0]); else throw new Error("No JSON: " + text.slice(0,300)); }
  if (!data?.answers?.length) throw new Error("Empty answers: " + JSON.stringify(data));

  // Gioi han toi da 4 answers de tranh vague
  const answers = normalizeAnswers(data.answers).slice(0, 4);

  return {
    question:   data.question || null,
    answers,
    confidence: data.confidence || "?",
  };
}

// ── Classify existing correctAnswer ──────────────────────────────────────────
function classifyAnswer(raw) {
  if (raw === null || raw === undefined) return { type: "C_null", text: null };

  // Truong hop JSON object {transcript: "..."}
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const transcript = raw.transcript || raw.question || null;
    if (transcript) return { type: "B_has_question", text: String(transcript) };
    return { type: "C_null", text: null };
  }

  // Da la array → da ok (skip tru khi --force)
  if (Array.isArray(raw)) return { type: "OK_array", text: null };

  // String cu (seed data)
  if (typeof raw === "string" && raw.trim()) return { type: "A_string", text: raw.trim() };

  return { type: "C_null", text: null };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("Args:", args);

  const db = new Client({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT || 5432),
    user:     process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await db.connect();
  console.log("Connected to DB.\n");

  // Neu --force: lay tat ca. Neu khong: bo qua cau da co array answer
  const whereSkip = args.force
    ? ""
    : `AND NOT (jsonb_typeof("correctAnswer") = 'array' AND jsonb_array_length("correctAnswer") > 0)`;

  const { rows } = await db.query(
    `SELECT id, code, content, "audioUrl", "correctAnswer"
     FROM questions
     WHERE type = 'SPEAKING_ANSWER_SHORT_QUESTION'
       ${whereSkip}
     ORDER BY code
     LIMIT $1`,
    [args.limit]
  );

  console.log(`Tim thay ${rows.length} cau can xu ly.\n`);

  let ok = 0, fail = 0, skipped = 0;

  for (const row of rows) {
    const idx = ok + fail + skipped + 1;
    process.stdout.write(`[${idx}/${rows.length}] ${row.code} `);

    const info = classifyAnswer(row.correctAnswer);

    try {
      let answers, question = null, confidence = "?", mode;

      if (info.type === "A_string") {
        // Co answer string cu → wrap sang array (khong goi AI, khong can)
        mode = "A:wrap";
        process.stdout.write(`[wrap "${info.text}"] `);
        answers = wrapStringToArray(info.text);
        confidence = "high";

      } else if (info.type === "B_has_question") {
        // Co cau hoi text → Gemini text-only
        mode = "B:text";
        process.stdout.write(`[text] `);
        const r = await answerFromText(info.text);
        answers = r.answers;
        confidence = r.confidence;
        // Giu content = question text neu content hien tai la garbage
        if (!row.content?.trim().endsWith("?")) question = info.text;

      } else if (info.type === "C_null") {
        // Khong co gi → download audio → Gemini
        mode = "C:audio";
        process.stdout.write(`[audio] `);
        const mimeType  = mimeFromUrl(row.audioUrl);
        const audioB64  = await fetchAudioBase64(row.audioUrl);
        const r = await answerFromAudio(audioB64, mimeType);
        answers = r.answers;
        question = r.question;
        confidence = r.confidence;

      } else {
        // OK_array nhung --force → re-generate tu audio
        mode = "F:force";
        process.stdout.write(`[force] `);
        const mimeType  = mimeFromUrl(row.audioUrl);
        const audioB64  = await fetchAudioBase64(row.audioUrl);
        const r = await answerFromAudio(audioB64, mimeType);
        answers = r.answers;
        question = r.question;
        confidence = r.confidence;
      }

      console.log(`answers=${JSON.stringify(answers)} conf=${confidence}`);
      if (question) console.log(`  -> question: ${question}`);

      if (!args.dryRun) {
        await db.query(
          `UPDATE questions
           SET "correctAnswer" = $1::jsonb,
               content = CASE
                 WHEN $2::text IS NOT NULL
                   AND (content IS NULL OR content NOT LIKE '%?')
                 THEN $2::text
                 ELSE content
               END,
               "updatedAt" = NOW()
           WHERE id = $3`,
          [JSON.stringify(answers), question, row.id]
        );
      }

      ok++;
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      fail++;
    }

    await sleep(2000); // tranh rate limit Gemini
  }

  await db.end();
  console.log(`\nHoan tat. OK: ${ok} | Fail: ${fail} | Skip: ${skipped}`);
  if (args.dryRun) console.log("(dry-run - khong ghi DB)");
}

main().catch(err => { console.error("Loi:", err.message); process.exit(1); });

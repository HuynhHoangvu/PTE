/* eslint-disable no-console */
/**
 * Backfill: Cap nhat "title" cho cac bai LISTENING_MCQ_MULTIPLE_ANSWER bi thieu.
 * Flags: --force, --limit N
 */

const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const USE_CDP = process.env.PTE_USE_CHROME_CDP === "1";
const CHROME_CDP_URL = process.env.PTE_CHROME_CDP_URL || "http://127.0.0.1:9222";

function askEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(message, () => { rl.close(); resolve(); }));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseArgs(argv) {
  const out = { force: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") out.force = true;
    else if (argv[i] === "--limit") { out.limit = Number(argv[i + 1]); i++; }
  }
  return out;
}

async function extractCodeAndTitle(page) {
  return page.evaluate(() => {
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(LMA\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    // Cau hoi that su nam trong MuiTypography-subtitle1 co chua "?"
    // (phan biet voi dong instruction "Listen to the recording...")
    let title = "";
    for (const el of document.querySelectorAll(".MuiTypography-subtitle1")) {
      const t = (el.innerText || "").trim();
      if (t.includes("?") && !t.toLowerCase().startsWith("listen")) {
        title = t;
        break;
      }
    }

    return { code, title };
  });
}

async function clickNext(page) {
  const btn = page.getByRole("button", { name: /next/i }).first();
  if ((await btn.count()) === 0 || !(await btn.isEnabled())) return false;
  await btn.click();
  await sleep(800);
  return true;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await db.connect();

  let sql = `SELECT code FROM questions WHERE type = 'LISTENING_MCQ_MULTIPLE_ANSWER'`;
  if (!opts.force) sql += ` AND (title IS NULL OR TRIM(title) = '')`;
  sql += ` ORDER BY code`;
  if (opts.limit) sql += ` LIMIT ${opts.limit}`;

  const { rows } = await db.query(sql);
  const targetCodes = new Set(rows.map((r) => r.code));

  if (targetCodes.size === 0) {
    console.log("Khong co bai nao can backfill title.");
    await db.end();
    return;
  }
  console.log(`Can backfill title cho ${targetCodes.size} bai.\n`);

  let browser, context, page;
  if (USE_CDP) {
    browser = await chromium.connectOverCDP(CHROME_CDP_URL);
    context = browser.contexts()[0];
    const pages = context.pages();
    page = pages.find((p) => (p.url() || "").includes("ptemagic.com")) || pages[0];
    console.log("Da ket noi Chrome CDP. Bat dau ngay...");
    await sleep(1000);
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(
      "https://ptemagic.com/pte-academic/question-bank/listening/practice?type=LISTENING_MCQ_L_MULTIPLE_ANSWER",
      { waitUntil: "domcontentloaded" }
    );
    await askEnter("Dang nhap xong thi nhan Enter...");
  }

  let updated = 0;
  let skipped = 0;
  const seen = new Set();
  const notFound = new Set([...targetCodes]);

  for (let i = 0; i < 5000; i++) {
    await sleep(400);
    const { code, title } = await extractCodeAndTitle(page);

    if (!code) { const moved = await clickNext(page); if (!moved) break; continue; }
    if (seen.has(code)) { console.log(`Da quay lai ${code}, dung.`); break; }
    seen.add(code);

    if (targetCodes.has(code)) {
      if (!title) {
        console.warn(`[SKIP] ${code}: khong lay duoc title`);
        skipped++;
      } else {
        await db.query(
          `UPDATE questions SET title = $1, "updatedAt" = NOW() WHERE code = $2`,
          [title, code]
        );
        console.log(`OK ${code}: "${title.substring(0, 70)}"`);
        updated++;
        notFound.delete(code);
      }
      if (notFound.size === 0) { console.log("\nDa cap nhat het, dung som."); break; }
    }

    const moved = await clickNext(page);
    if (!moved) break;
  }

  if (notFound.size > 0) console.log(`\nChua tim thay ${notFound.size} bai: ${[...notFound].join(", ")}`);
  console.log(`\nXong. Cap nhat: ${updated}, bo qua: ${skipped}`);
  await db.end();
  if (!USE_CDP) await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

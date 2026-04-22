/* eslint-disable no-console */
/**
 * Backfill: Chi cap nhat "title" (cau hoi) cho cac bai READING_MCQ_MULTIPLE_ANSWER bi thieu.
 * Script mo trang PTE Magic, cuon qua tung bai theo code, lay h6 roi luu vao DB.
 *
 * Flags:
 *   --force     Cap nhat ca nhung bai da co title (overwrite)
 *   --limit N   Chi xu ly N bai
 */

const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/reading/practice?type=READING_MCQ_R_MULTIPLE_ANSWER";
const USE_CDP = process.env.PTE_USE_CHROME_CDP === "1";
const CHROME_CDP_URL = process.env.PTE_CHROME_CDP_URL || "http://127.0.0.1:9222";

function askEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(message, () => { rl.close(); resolve(); }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    const codeMatch = bodyText.match(/(RMA\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    const questionNode =
      document.querySelector(".css-gsjzcg h6") ||
      document.querySelector(".MuiStack-root h6:not(.MuiTypography-h5)") ||
      document.querySelector("h6");
    const title = questionNode ? questionNode.innerText.trim() : "";

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

  // Lay danh sach code can backfill
  let sql = `SELECT code FROM questions WHERE type = 'READING_MCQ_MULTIPLE_ANSWER'`;
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
  console.log(`Can backfill title cho ${targetCodes.size} bai: ${[...targetCodes].join(", ")}\n`);

  // Mo trinh duyet
  let browser, context, page;
  if (USE_CDP) {
    browser = await chromium.connectOverCDP(CHROME_CDP_URL);
    context = browser.contexts()[0];
    const pages = context.pages();
    page = pages.find((p) => (p.url() || "").includes("ptemagic.com")) || pages[0];
    console.log("Da ket noi Chrome CDP.");
    await askEnter("Vao trang Reading MCQ Multiple Answer tren PTE Magic, roi nhan Enter...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    await askEnter("Dang nhap xong thi nhan Enter de bat dau...");
  }

  let updated = 0;
  let skipped = 0;
  let notFound = new Set([...targetCodes]);
  const seen = new Set();

  // Cuon qua cac bai cho den khi gap het code can update
  for (let i = 0; i < 5000; i++) {
    await sleep(400);
    const { code, title } = await extractCodeAndTitle(page);

    if (!code) {
      const moved = await clickNext(page);
      if (!moved) break;
      continue;
    }

    if (seen.has(code)) {
      console.log(`Da quay lai ${code}, dung.`);
      break;
    }
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

      // Neu da update het roi thi dung som
      if (notFound.size === 0) {
        console.log("\nDa cap nhat het, dung som.");
        break;
      }
    } else {
      console.log(`Bo qua ${code} (da co title)`);
    }

    const moved = await clickNext(page);
    if (!moved) break;
  }

  if (notFound.size > 0) {
    console.log(`\nChua tim thay ${notFound.size} bai: ${[...notFound].join(", ")}`);
  }

  console.log(`\nXong. Cap nhat: ${updated}, bo qua: ${skipped}`);
  await db.end();
  if (!USE_CDP) await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/speaking/practice?type=SPEAKING_REPEAT_SENTENCE";
const MAX_ITEMS = Number(process.env.PTE_MAX_ITEMS || 2000);
const USE_CDP = process.env.PTE_USE_CHROME_CDP === "1";
const CHROME_CDP_URL = process.env.PTE_CHROME_CDP_URL || "http://127.0.0.1:9222";

function askEnter(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractFromDom(page) {
  return page.evaluate(() => {
    const textBlocks = Array.from(document.querySelectorAll("h1,h2,h3,h4,p,span,div"))
      .map((el) => (el.innerText || "").trim())
      .filter(Boolean);

    const normalized = textBlocks
      .map((v) => v.replace(/\s+/g, " ").trim())
      .filter((v) => v.length > 0);

    const code = normalized.find((v) => /^RS\d{4,}$/i.test(v)) || null;
    const instruction =
      normalized.find(
        (v) =>
          v.toLowerCase().includes("repeat the sentence exactly as you hear it") ||
          v.toLowerCase().includes("you will hear a sentence only once")
      ) || null;

    const audio = document.querySelector("audio");
    const audioSource = audio?.querySelector("source");
    let audioUrl =
      audio?.src ||
      audio?.getAttribute("src") ||
      audioSource?.src ||
      audioSource?.getAttribute("src") ||
      null;

    if (!audioUrl) {
      const html = document.documentElement?.innerHTML || "";
      const match = html.match(/https?:\/\/[^"' ]+\.(mp3|wav|m4a)(\?[^"' ]*)?/i);
      if (match) audioUrl = match[0];
    }

    const nextButton = Array.from(document.querySelectorAll("button")).find((btn) =>
      /next/i.test((btn.innerText || "").trim())
    );
    const canGoNext = !!nextButton && !nextButton.disabled;

    return {
      code,
      content: instruction,
      audioUrl,
      canGoNext,
    };
  });
}

async function clickNext(page) {
  const nextButton = page.getByRole("button", { name: /next/i }).first();
  if ((await nextButton.count()) === 0) return false;
  if (!(await nextButton.isEnabled())) return false;
  await nextButton.click();
  await sleep(1200);
  return true;
}

async function clickStartIfNeeded(page) {
  const startButton = page.getByRole("button", { name: /start to practice/i }).first();
  if ((await startButton.count()) > 0 && (await startButton.isVisible())) {
    await startButton.click();
    await sleep(1200);
  }
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

  let browser;
  let context;
  let page;

  if (USE_CDP) {
    console.log(`Dang ket noi Chrome CDP: ${CHROME_CDP_URL}`);
    browser = await chromium.connectOverCDP(CHROME_CDP_URL);
    context = browser.contexts()[0];
    if (!context) {
      throw new Error("Khong tim thay browser context. Hay mo Chrome voi --remote-debugging-port=9222.");
    }
    const pages = context.pages();
    page =
      pages.find((p) => (p.url() || "").includes("ptemagic.com")) ||
      pages.find((p) => (p.url() || "").includes("/question-bank/speaking/practice")) ||
      pages[0] ||
      (await context.newPage());

    console.log("\n1) Dang nhap tren cua so Chrome that ban vua mo.");
    console.log("2) Mo trang Repeat sentence.");
    console.log("3) Bam Start to practice de hien audio.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
    if (!page.url() || !page.url().includes("/question-bank/speaking/practice")) {
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
  } else {
    try {
      // Use installed Google Chrome to reduce sign-in blocking on testing browsers.
      browser = await chromium.launch({ headless: false, channel: "chrome" });
    } catch (err) {
      console.warn("Khong mo duoc Chrome channel, fallback sang Chromium:", err.message);
      browser = await chromium.launch({ headless: false });
    }
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });

    console.log("\n1) Dang nhap PTE Magic trong cua so browser vua mo.");
    console.log("2) Vao dung man hinh Repeat sentence.");
    console.log("3) Bam Start to practice de hien audio.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await clickStartIfNeeded(page);
    await sleep(500);
    const data = await extractFromDom(page);

    if (!data.code || !data.audioUrl) {
      console.log(`Bo qua item ${i + 1}: thieu code/audio.`);
      const moved = await clickNext(page);
      if (!moved) break;
      continue;
    }

    if (seen.has(data.code)) {
      console.log(`Da quay lai ma ${data.code}, dung crawl.`);
      break;
    }
    seen.add(data.code);

    const sql = `
      INSERT INTO questions ("code","skill","type","content","audioUrl","level","prepTime","responseTime")
      VALUES ($1,'SPEAKING','SPEAKING_REPEAT_SENTENCE',$2,$3,'Medium',0,40)
      ON CONFLICT ("code")
      DO UPDATE SET
        "skill" = EXCLUDED."skill",
        "type" = EXCLUDED."type",
        "content" = EXCLUDED."content",
        "audioUrl" = EXCLUDED."audioUrl",
        "updatedAt" = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    const res = await db.query(sql, [data.code, data.content, data.audioUrl]);
    if (res.rows?.[0]?.inserted) inserted += 1;
    else updated += 1;

    console.log(
      `[${i + 1}] ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | ${data.audioUrl}`
    );

    const moved = await clickNext(page);
    if (!moved) {
      console.log("Khong bam duoc Next nua, ket thuc.");
      break;
    }
  }

  console.log(`\nHoan tat. Insert: ${inserted}, Update: ${updated}, Tong: ${inserted + updated}`);

  if (!USE_CDP) {
    await context.close();
    await browser.close();
  } else {
    await browser.close();
  }
  await db.end();
}

main().catch(async (err) => {
  console.error("Loi:", err.message);
  process.exit(1);
});


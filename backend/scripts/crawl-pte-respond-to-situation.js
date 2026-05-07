/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/speaking/practice?type=SPEAKING_RESPOND_TO_SITUATION_ACADEMIC";
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

    // Tìm code RASAxxxx trong trang
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(RASA\d{4,})|(RTS\d{4,})/i);
    const code = codeMatch ? (codeMatch[1] || codeMatch[2]).toUpperCase() : null;

    // Tìm đoạn đề RTS thật (text dưới audio), tránh lấy menu/header.
    // Ưu tiên đúng p.MuiTypography-body1 chứa câu hỏi dài có dấu "?"
    let situationText = null;
    const pCandidates = Array.from(
      document.querySelectorAll("p.MuiTypography-root.MuiTypography-body1, p.MuiTypography-body1, p")
    )
      .map((el) => (el.innerText || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const isInstruction = (t) =>
      /listen to and read a description of situation|please answer as completely as you can|you will have \d+ seconds/i.test(
        t
      );
    const isNoise = (t) =>
      /question bank|magic centre|documentation|resources|tips & sample|analysis/i.test(t);

    // 1) Ưu tiên câu có dấu hỏi, đủ dài, không phải instruction/noise
    const byQuestionMark = pCandidates.find(
      (t) => t.includes("?") && t.length >= 40 && !isInstruction(t) && !isNoise(t)
    );
    if (byQuestionMark) {
      situationText = byQuestionMark;
    } else {
      // 2) fallback: đoạn dài nhất còn lại sau khi loại instruction/noise
      const filtered = pCandidates.filter((t) => t.length >= 40 && !isInstruction(t) && !isNoise(t));
      if (filtered.length > 0) {
        filtered.sort((a, b) => b.length - a.length);
        situationText = filtered[0];
      }
    }

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
      // Chỉ lấy PHẦN CHỮ dưới file ghi âm cho app hiển thị
      content: situationText,
      // audioUrl giữ lại nếu sau này cần, nhưng không bắt buộc
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
  await sleep(500); 
  return true;
}

async function clickStartIfNeeded(page) {
  const startButton = page.getByRole("button", { name: /start to practice/i }).first();
  if ((await startButton.count()) > 0 && (await startButton.isVisible())) {
    await startButton.click();
    await sleep(1500);
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
    console.log("2) Mo trang Respond to a situation.");
    console.log("3) Bam Start de hien audio.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
    
    const currentUrl = page.url() || "";
    if (!currentUrl.includes("/question-bank/speaking/practice")) {
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
  } else {
    try {
      browser = await chromium.launch({ headless: false, channel: "chrome" });
    } catch (err) {
      console.warn("Khong mo duoc Chrome channel, fallback sang Chromium:", err.message);
      browser = await chromium.launch({ headless: false });
    }
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });

    console.log("\n1) Dang nhap PTE Magic trong cua so browser vua mo.");
    console.log("2) Vao dung man hinh Respond to a situation.");
    console.log("3) Bam Start de hien audio.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await clickStartIfNeeded(page);
    await sleep(800);
    const data = await extractFromDom(page);

    if (!data.code || !data.content) {
      console.log(`Bo qua item ${i + 1}: CODE = ${data.code}, CONTENT = ${data.content}`);
      const moved = await clickNext(page);
      if (!moved) break;
      continue;
    }

    if (seen.has(data.code)) {
      console.log(`Da quay lai ma ${data.code}, dung crawl.`);
      break;
    }
    seen.add(data.code);

    try {
        const sql = `
          INSERT INTO questions ("code","skill","type","content","audioUrl","level","prepTime","responseTime")
          VALUES ($1,'SPEAKING','SPEAKING_RESPOND_TO_SITUATION',$2,NULL,'Medium',10,40)
          ON CONFLICT ("code")
          DO UPDATE SET
            "skill" = EXCLUDED."skill",
            "type" = EXCLUDED."type",
            "content" = EXCLUDED."content",
            "audioUrl" = EXCLUDED."audioUrl",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const res = await db.query(sql, [data.code, data.content]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        const preview = (data.content || "").replace(/\s+/g, " ").trim().slice(0, 180);
        console.log(
          `[${i + 1}] ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"}`
        );
        console.log(`    content: ${preview}${preview.length >= 180 ? "..." : ""}`);
    } catch (dbErr) {
        console.error(`Loi DB voi ${data.code}:`, dbErr.message);
    }

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

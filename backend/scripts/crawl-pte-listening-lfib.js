/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/listening/practice?type=LISTENING_FIB_L";
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

async function extractLfibData(page) {
  return page.evaluate(() => {
    // Tìm code LFIBxxxx
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(LFIB\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    if (!code) return { code: null };

    // Tìm thẻ audio
    const audioNode = document.querySelector("audio");
    const audioUrl = audioNode ? audioNode.getAttribute("src") : null;

    // Tìm container bài đọc (thường là div css-19kzrtu)
    const container = document.querySelector(".MuiBox-root.css-19kzrtu") || document.querySelector(".MuiTypography-root").parentElement;
    if (!container) return { code, audioUrl };

    const segments = [];
    const correctAnswers = [];
    const children = Array.from(container.childNodes);

    children.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) segments.push({ text: node.textContent, isBlank: false });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const style = node.getAttribute("style") || "";
        
        // 1. Text bình thường (có line-height: 35px)
        if (style.includes("line-height: 35px")) {
          segments.push({ text: node.innerText, isBlank: false });
        }
        // 2. Ô trống (Input)
        else if (node.querySelector("input") || node.tagName === "INPUT") {
          segments.push({ text: "", isBlank: true });
        }
        // 3. Đáp án đúng ẩn (display: none)
        else if (style.includes("display: none")) {
          const ans = node.innerText.trim();
          if (ans) correctAnswers.push(ans);
        }
      }
    });

    return { code, audioUrl, segments, correctAnswer: correctAnswers };
  });
}

async function clickNext(page) {
  const nextButton = page.getByRole("button", { name: /next/i }).first();
  if ((await nextButton.count()) === 0) return false;
  if (!(await nextButton.isEnabled())) return false;
  await nextButton.click();
  await sleep(1000); 
  return true;
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
    const pages = context.pages();
    page = pages.find((p) => (p.url() || "").includes("ptemagic.com")) || pages[0];

    console.log("\n1) Mo trang Listening Fill in the Blanks (LFIB).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    console.log("\n1) Dang nhap va vao trang Listening Fill in the Blanks (LFIB).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await sleep(500);
    const data = await extractLfibData(page);

    if (!data.code || !data.audioUrl || !data.segments) {
      console.log(`Bo qua item ${i + 1}: CODE = ${data.code}`);
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
          INSERT INTO questions ("code","skill","type","audioUrl","content","correctAnswer","level")
          VALUES ($1,'LISTENING','LISTENING_FIB_L',$2,$3,$4,'Medium')
          ON CONFLICT ("code")
          DO UPDATE SET
            "audioUrl" = EXCLUDED."audioUrl",
            "content" = EXCLUDED."content",
            "correctAnswer" = EXCLUDED."correctAnswer",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const res = await db.query(sql, [
          data.code, 
          data.audioUrl,
          JSON.stringify(data.segments),
          JSON.stringify(data.correctAnswer)
        ]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        console.log(
          `OK ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | Answers: ${data.correctAnswer.join(", ")}`
        );
    } catch (dbErr) {
        console.error(`Loi DB voi ${data.code}:`, dbErr.message);
    }

    const moved = await clickNext(page);
    if (!moved) break;
  }

  console.log(`\nHoan tat. Insert: ${inserted}, Update: ${updated}`);
  await db.end();
  if (!USE_CDP) await browser.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

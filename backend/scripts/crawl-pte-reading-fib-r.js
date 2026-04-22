/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/reading/practice?type=READING_FIB_R";
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

async function extractFibRData(page) {
  return page.evaluate(async () => {
    // Tìm code RFIBxxxx
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(RFIB\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    if (!code) return { code: null };

    // Tìm container bài đọc (thường là thẻ p có class css-1ibacvq)
    const container = document.querySelector("p.css-1ibacvq") || document.querySelector(".MuiTypography-paragraph");
    if (!container) return { code };

    const segments = [];
    const correctAnswers = [];
    const children = Array.from(container.childNodes);

    children.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) segments.push({ text: node.textContent, isBlank: false });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const style = node.getAttribute("style") || "";
        const textContent = node.textContent.trim();

        // 1. Text bình thường
        if (style.includes("line-height: 35px")) {
          segments.push({ text: node.textContent, isBlank: false });
        }
        // 2. Ô trống (Input)
        else if (node.querySelector("input") || node.tagName === "INPUT") {
          segments.push({ text: "", isBlank: true });
        }
        // 3. Đáp án đúng ẩn
        else if (style.includes("display: inline-block") || node.querySelector("[style*='display: none']")) {
          const ans = node.textContent.replace(/\s+/g, " ").trim();
          if (ans) correctAnswers.push(ans);
        }
      }
    });

    // Tìm pool các từ lựa chọn (nằm trong div css-1sjnp5b)
    const poolContainer = document.querySelector(".css-1sjnp5b") || document.querySelector(".MuiBox-root[draggable='true']").parentElement;
    const poolOptions = poolContainer 
      ? Array.from(poolContainer.querySelectorAll("span")).map(s => s.innerText.trim()).filter(Boolean)
      : [];

    return { code, segments, correctAnswer: correctAnswers, options: poolOptions };
  });
}

async function clickNext(page) {
  const nextButton = page.getByRole("button", { name: /next/i }).first();
  if ((await nextButton.count()) === 0) return false;
  if (!(await nextButton.isEnabled())) return false;
  await nextButton.click();
  await sleep(800); 
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

    console.log("\n1) Mo trang Reading Fill in the Blanks (RFIB).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    console.log("\n1) Dang nhap va vao trang Reading Fill in the Blanks (RFIB).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await sleep(500);
    const data = await extractFibRData(page);

    if (!data.code || !data.segments) {
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
          INSERT INTO questions ("code","skill","type","content","options","correctAnswer","level")
          VALUES ($1,'READING','READING_FIB_R',$2,$3,$4,'Medium')
          ON CONFLICT ("code")
          DO UPDATE SET
            "options" = EXCLUDED."options",
            "correctAnswer" = EXCLUDED."correctAnswer",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        // Đối với FIB_R, content sẽ lưu JSON segments để render cho dễ
        const res = await db.query(sql, [
          data.code, 
          JSON.stringify(data.segments),
          JSON.stringify(data.options),
          JSON.stringify(data.correctAnswer)
        ]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        console.log(
          `OK ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | Answers: ${data.correctAnswer.join(", ")} | Pool: ${data.options.length}`
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

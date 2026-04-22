/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/listening/practice?type=LISTENING_MCQ_L_MULTIPLE_ANSWER";
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

async function extractLmaData(page) {
  return page.evaluate(() => {
    // Tìm code LMAxxxx
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(LMA\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    if (!code) return { code: null };

    // Tìm thẻ audio
    const audioNode = document.querySelector("audio");
    const audioUrl = audioNode ? audioNode.getAttribute("src") : null;

    // Tìm câu hỏi — tránh các h6 là UI label như "Need help?"
    // Ptemagic hiển thị câu hỏi trong MuiTypography-h6 hoặc p trong question-container
    const GARBAGE = ["need help", "need help?", "help", ""];
    let title = "";
    const h6s = Array.from(document.querySelectorAll("h6"));
    for (const node of h6s) {
      const text = node.innerText.trim();
      if (text && !GARBAGE.includes(text.toLowerCase())) {
        title = text;
        break;
      }
    }
    // Fallback: tìm trong các paragraph gần audio — thường là câu hỏi thật
    if (!title) {
      const pNodes = Array.from(document.querySelectorAll("p"));
      for (const p of pNodes) {
        const text = p.innerText.trim();
        if (text.length > 20 && text.includes("?") && !GARBAGE.includes(text.toLowerCase())) {
          title = text;
          break;
        }
      }
    }

    // Tìm danh sách lựa chọn
    const optionRows = Array.from(document.querySelectorAll(".MuiFormGroup-root .MuiStack-root"));
    const options = optionRows.map(row => {
      const label = row.querySelector("p:nth-of-type(1)")?.innerText.trim() || "";
      const text = row.querySelector("p:nth-of-type(2)")?.innerText.trim() || "";
      return { label, text };
    }).filter(opt => opt.label && opt.text);

    return { code, audioUrl, title, options };
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

    console.log("\n1) Mo trang Listening MCQ Multiple Answer.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    console.log("\n1) Dang nhap va vao trang Listening MCQ Multiple Answer.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await sleep(500);
    const data = await extractLmaData(page);

    if (!data.code || !data.audioUrl || !data.options || data.options.length === 0) {
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
          INSERT INTO questions ("code","skill","type","audioUrl","title","options","level")
          VALUES ($1,'LISTENING','LISTENING_MCQ_MULTIPLE_ANSWER',$2,$3,$4,'Medium')
          ON CONFLICT ("code")
          DO UPDATE SET
            "audioUrl" = EXCLUDED."audioUrl",
            "title" = EXCLUDED."title",
            "options" = EXCLUDED."options",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const res = await db.query(sql, [
          data.code, 
          data.audioUrl,
          data.title,
          JSON.stringify(data.options)
        ]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        console.log(
          `OK ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | Options: ${data.options.length}`
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

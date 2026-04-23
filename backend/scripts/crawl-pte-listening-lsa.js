/* eslint-disable no-console */
/**
 * Listening — Multiple Choice, Choose Single Answer (LISTENING_MCQ_L_SINGLE_ANSWER).
 * DOM PTE Magic: `.MuiCard-root h6` = mã LSAxxxx; stem MCQ = khối chữ trước `.MuiRadioGroup-root` (không dùng h6 làm title).
 * CDP + Chrome profile: giống `crawl-pte-reading-rsa.js` (PTE_USE_CHROME_CDP, PTE_CHROME_CDP_URL,
 * Chrome với --remote-debugging-port=9222 và --user-data-dir=...).
 */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/listening/practice?type=LISTENING_MCQ_L_SINGLE_ANSWER";
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

async function extractLsaData(page) {
  return page.evaluate(() => {
    const card =
      document.querySelector(".MuiPaper-root.MuiCard-root") ||
      document.querySelector(".MuiCard-root");

    /** PTE Magic: #root … .MuiCard-root … h6 = mã LSAxxxx, KHÔNG phải stem MCQ. */
    let code = null;
    const h6 = card?.querySelector("h6");
    if (h6) {
      const m = h6.innerText.trim().match(/^(LSA\d{4,})$/i);
      if (m) code = m[1].toUpperCase();
    }
    if (!code) {
      const bodyText = document.body.innerText || "";
      const codeMatch = bodyText.match(/(LSA\d{4,})/i);
      code = codeMatch ? codeMatch[1].toUpperCase() : null;
    }

    if (!code) return { code: null };

    const audioNode = document.querySelector("audio");
    const audioUrl = audioNode ? audioNode.getAttribute("src") : null;

    // Stem: đoạn văn trong card, trước nhóm radio, không phải instruction / mã câu
    const instructionRe =
      /Listen to the recording|Only one response is correct|selecting the correct response/i;
    let title = "";
    const radio = card?.querySelector(".MuiRadioGroup-root");
    if (card && radio) {
      let el = radio.previousElementSibling;
      while (el) {
        const ps = el.querySelectorAll?.("p") || [];
        const chunks = ps.length
          ? Array.from(ps).map((p) => p.innerText.trim()).filter(Boolean)
          : (el.innerText || "")
              .trim()
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
        for (const t of chunks) {
          if (!t || t.length < 12) continue;
          if (instructionRe.test(t)) continue;
          if (/^(LSA|RSA|RMQA|RB)\d{4,}$/i.test(t)) continue;
          if (/^(Repeated|Trending)$/i.test(t)) continue;
          if (t.length > title.length) title = t;
        }
        el = el.previousElementSibling;
      }
    }

    const optionRows = Array.from(document.querySelectorAll(".MuiRadioGroup-root .MuiStack-root"));
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

    console.log("\n1) Mo trang Listening MCQ Single Answer.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    console.log("\n1) Dang nhap va vao trang Listening MCQ Single Answer.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await sleep(500);
    const data = await extractLsaData(page);

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
          VALUES ($1,'LISTENING','LISTENING_MCQ_SINGLE_ANSWER',$2,$3,$4,'Medium')
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

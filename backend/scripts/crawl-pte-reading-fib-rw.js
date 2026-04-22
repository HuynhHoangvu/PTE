/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/reading/practice?type=READING_FIB_R_W";
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

async function extractFibData(page) {
  return page.evaluate(async () => {
    // Tìm code RWFIBxxxx
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(RWFIB\d{4,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    if (!code) return { code: null };

    const container = document.querySelector(".MuiBox-root.css-19kzrtu");
    if (!container) return { code };

    const segments = [];
    const correctAnswers = [];
    
    // Duyệt qua các con trực tiếp của container
    const children = Array.from(container.children);

    children.forEach((child) => {
      const style = child.getAttribute("style") || "";
      const text = child.textContent.trim();

      // 1. Nếu là text bình thường (thường có line-height: 35px)
      if (style.includes("line-height: 35px")) {
        if (text) segments.push({ text: child.textContent, isBlank: false });
      } 
      // 2. Nếu là container chứa ô trống (thường là span không có style đặc biệt bao quanh div.MuiInputBase-root)
      else if (child.querySelector(".MuiInputBase-root, [role='combobox']")) {
        segments.push({ text: "", isBlank: true, options: [] });
      }
      // 3. Nếu là container chứa đáp án ẩn (thường có display: inline-block)
      else if (style.includes("display: inline-block") || child.querySelector("[style*='display: none']")) {
        // PHẢI dùng textContent vì display:none thì innerText sẽ rỗng
        const hiddenAnswer = child.textContent.replace(/\s+/g, " ").trim();
        if (hiddenAnswer) {
          correctAnswers.push(hiddenAnswer);
        }
      }
    });

    return { code, segments, correctAnswers };
  });
}

async function getOptionsForBlanks(page, initialData) {
  const { segments, correctAnswers } = initialData;
  const finalSegments = JSON.parse(JSON.stringify(segments));
  
  const dropdownLocator = page.locator(".MuiBox-root.css-19kzrtu [role='combobox']");
  const dropdownCount = await dropdownLocator.count();
  
  let blankIndex = 0;
  for (let i = 0; i < finalSegments.length; i++) {
    if (finalSegments[i].isBlank) {
      if (blankIndex < dropdownCount) {
        const el = dropdownLocator.nth(blankIndex);
        try {
          await el.scrollIntoViewIfNeeded();
          await el.click();
          await page.waitForTimeout(600); 

          const options = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll("[role='option'], .MuiMenuItem-root"));
            return items.map(el => el.innerText.trim()).filter(Boolean);
          });

          if (options.length > 0) {
            finalSegments[i].options = options;
          }

          await page.keyboard.press("Escape");
          await page.waitForTimeout(400); 
        } catch (err) {
          console.error(`   Loi blank ${blankIndex + 1}:`, err.message);
        }
      }
      blankIndex++;
    }
  }
  return { segments: finalSegments, correctAnswer: correctAnswers };
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
    page = pages.find((p) => p.url().includes("ptemagic.com")) || pages[0];

    console.log("\n1) Mo trang Reading FIB R&W.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  } else {
    browser = await chromium.launch({ headless: false, channel: "chrome" });
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    console.log("\n1) Dang nhap va mo dung trang Reading FIB R&W.");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await sleep(500);
    const initialData = await extractFibData(page);

    if (!initialData.code || !initialData.segments) {
      console.log(`Bo qua item ${i + 1}: CODE = ${initialData.code}`);
      const moved = await clickNext(page);
      if (!moved) break;
      continue;
    }

    if (seen.has(initialData.code)) {
      console.log(`Da quay lai ma ${initialData.code}, dung crawl.`);
      break;
    }
    seen.add(initialData.code);

    // Bắt đầu click vào từng blank để lấy options (Đây là phần quan trọng)
    console.log(`[${i + 1}] Dang lay options cho ${initialData.code}...`);
    const result = await getOptionsForBlanks(page, initialData);

    try {
        const sql = `
          INSERT INTO questions ("code","skill","type","options","correctAnswer","level")
          VALUES ($1,'READING','READING_FIB_R_W',$2,$3,'Medium')
          ON CONFLICT ("code")
          DO UPDATE SET
            "options" = EXCLUDED."options",
            "correctAnswer" = EXCLUDED."correctAnswer",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const res = await db.query(sql, [
          initialData.code, 
          JSON.stringify(result.segments), 
          JSON.stringify(result.correctAnswer)
        ]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        console.log(
          `OK ${initialData.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | Answers: ${result.correctAnswer.join(", ")}`
        );
    } catch (dbErr) {
        console.error(`Loi DB voi ${initialData.code}:`, dbErr.message);
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

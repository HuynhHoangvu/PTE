/* eslint-disable no-console */
const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TARGET_URL =
  "https://ptemagic.com/pte-academic/question-bank/speaking/practice?type=SPEAKING_DESCRIBE_IMAGE";
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

    // Tìm code DI00xx trong toàn bộ trang thay vì phải khớp chuẩn 100% 1 text block
    const bodyText = document.body.innerText || "";
    const codeMatch = bodyText.match(/(DI\d{3,})/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : null;

    let instruction = null;
    const instructionNode = Array.from(document.querySelectorAll("span, p, div")).find(
      (el) =>
        (el.innerText || "").toLowerCase().includes("describe in detail what the graph is showing") ||
        (el.innerText || "").toLowerCase().includes("describe the image")
    );
    if (instructionNode) {
        instruction = instructionNode.innerText.trim();
    }

    let imageUrl = null;
    // Sử dụng bộ chọn chính xác từ user
    const directImg = document.querySelector("#root > div.css-1np3eo0 > div > main > div > div.MuiStack-root.css-1lffbe3 > div.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation1.MuiCard-root.css-8fwrlk > div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-6.css-1mbxi4q > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-md-7.css-18z1kbm > img");
    
    if (directImg) {
      imageUrl = directImg.src;
    } else {
      // Fallback tìm ảnh có src chứa từ khóa
      const imgs = Array.from(document.querySelectorAll("img"));
      const targetImg = imgs.find((img) => img.src && (img.src.includes("pte-magic-question") || img.src.includes("DESCRIBE_IMAGE")));
      if (targetImg) imageUrl = targetImg.src;
    }

    const nextButton = Array.from(document.querySelectorAll("button")).find((btn) =>
      /next/i.test((btn.innerText || "").trim())
    );
    const canGoNext = !!nextButton && !nextButton.disabled;

    return {
      code,
      content: instruction,
      imageUrl,
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
    console.log("2) Mo trang Describe Image.");
    console.log("3) Bam Start to practice de hien anh (neu can).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
    
    const currentUrl = page.url() || "";
    if (!currentUrl.includes("/question-bank/speaking/practice")) {
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    } else {
      console.log("👉 Đang tiếp tục trên tab mục tiêu, không tự goto để giữ nguyên trạng thái tab...");
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
    console.log("2) Vao dung man hinh Describe Image.");
    console.log("3) Bam Start to practice de hien anh (neu can).");
    await askEnter("\nXong thi quay lai terminal va nhan Enter de bat dau crawl...");
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set();

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    await clickStartIfNeeded(page);
    await sleep(500);
    const data = await extractFromDom(page);

    if (!data.code || !data.imageUrl) {
      console.log(`Bo qua item ${i + 1}: CODE = ${data.code}, IMAGE_URL = ${data.imageUrl}`);
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
          INSERT INTO questions ("code","skill","type","content","imageUrl","level","prepTime","responseTime")
          VALUES ($1,'SPEAKING','SPEAKING_DESCRIBE_IMAGE',$2,$3,'Medium',25,40)
          ON CONFLICT ("code")
          DO UPDATE SET
            "skill" = EXCLUDED."skill",
            "type" = EXCLUDED."type",
            "content" = EXCLUDED."content",
            "imageUrl" = EXCLUDED."imageUrl",
            "updatedAt" = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const res = await db.query(sql, [data.code, data.content, data.imageUrl]);
        if (res.rows?.[0]?.inserted) inserted += 1;
        else updated += 1;

        console.log(
          `[${i + 1}] ${data.code} | ${res.rows?.[0]?.inserted ? "INSERT" : "UPDATE"} | ${data.imageUrl}`
        );
    } catch (dbErr) {
        console.error(`Loi DB voi ${data.code} (Co the do column name error):`, dbErr.message);
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

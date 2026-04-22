/* eslint-disable no-console */
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MAX_ITEMS = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1] || "50", 10)
  : 9999;
const FORCE = process.argv.includes("--force"); // Ghi đè cả những câu đã có suggestedAnswer
const DRY_RUN = process.argv.includes("--dry-run"); // Không lưu vào DB, chỉ in ra màn hình

if (!process.env.GEMINI_API_KEY) {
  console.error("Thiết lập biến môi trường GEMINI_API_KEY trong .env để chạy script này.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Sử dụng flash cho tốc độ xử lý nhanh, giá rẻ và đủ thông minh để Describe Image
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hàm tải ảnh từ URL và chuyển thành base64 dùng cho Gemini
async function fetchImageAsBase64Mime(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Khong the tai anh tu url: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(buffer).toString("base64");
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

async function generateSampleAnswer(imageUrl, code) {
  const imagePart = await fetchImageAsBase64Mime(imageUrl);

  const prompt = `You are a PTE Academic expert. 
I am providing an image used in the "Describe Image" speaking task (Code: ${code}).

Analyze this image and return a JSON object with two fields:
1. "keywords": A comma-separated string of the most important concepts, labels, objects, and trends shown in the image (this will be used for scoring).
2. "suggestion": A short, natural sample answer transcript (around 50-70 words) that describes the image.

Return ONLY the valid JSON object. No extra text or markdown code blocks.`;

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text().trim().replace(/```json|```/g, "");
  return JSON.parse(text);
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

  let sql = `SELECT id, code, "imageUrl", "suggestedAnswer" FROM questions WHERE "type" = 'SPEAKING_DESCRIBE_IMAGE' AND "imageUrl" IS NOT NULL`;
  if (!FORCE) {
    sql += ` AND ("suggestedAnswer" IS NULL OR "suggestedAnswer" = '')`;
  }
  sql += ` ORDER BY "code" ASC LIMIT $1`;

  const { rows } = await db.query(sql, [MAX_ITEMS]);
  console.log(`Tìm thấy ${rows.length} câu Describe Image cần xử lý.`);

  let updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const q = rows[i];
    console.log(`\n[${i + 1}/${rows.length}] Đang xử lý: ${q.code}`);

    try {
      const data = await generateSampleAnswer(q.imageUrl, q.code);
      
      const keywordArray = data.keywords.split(",").map(s => s.trim()).filter(Boolean);

      console.log(`\x1b[33mKeywords: \x1b[0m${JSON.stringify(keywordArray)}`);
      console.log(`\x1b[36mSuggestion: \x1b[0m${data.suggestion}`);

      if (!DRY_RUN) {
        await db.query(
          `UPDATE questions SET "suggestedAnswer" = $1, "correctAnswer" = $2 WHERE id = $3`, 
          [data.suggestion, JSON.stringify(keywordArray), q.id]
        );
        updated++;
        console.log(`✓ Đã lưu vào Database.`);
      } else {
        console.log(`--- [DRY-RUN] Bỏ qua lưu DB ---`);
      }
      
      await sleep(1500); 
    } catch (err) {
      console.error(`❌ Lỗi tại ${q.code}:`, err.message);
    }
  }

  console.log(`\nHoàn tất! Đã cập nhật ${updated} câu.`);
  await db.end();
}

main().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});

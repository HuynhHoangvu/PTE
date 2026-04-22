/* eslint-disable no-console */
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    console.log("--- THỐNG KÊ QUESTION BANK ---\n");

    const sql = `
      SELECT 
        type, 
        COUNT(*) as total,
        COUNT("audioUrl") FILTER (WHERE "audioUrl" IS NOT NULL AND "audioUrl" <> '') as with_audio,
        COUNT("correctAnswer") FILTER (WHERE "correctAnswer" IS NOT NULL) as with_answer,
        COUNT("correctAnswer"->>'transcript') FILTER (WHERE "correctAnswer"->>'transcript' IS NOT NULL AND "correctAnswer"->>'transcript' <> '') as with_transcript
      FROM questions
      GROUP BY type
      ORDER BY total DESC
    `;

    const { rows } = await client.query(sql);
    
    console.table(rows);

    const { rows: totalRows } = await client.query('SELECT COUNT(*) FROM questions');
    console.log(`\nTổng cộng: ${totalRows[0].count} câu hỏi.`);

  } catch (err) {
    console.error("Lỗi kết nối DB:", err.message);
  } finally {
    await client.end();
  }
}

main();

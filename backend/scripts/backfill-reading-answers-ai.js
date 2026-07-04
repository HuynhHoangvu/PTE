/* eslint-disable no-console */
/**
 * AI Reading Backfill: Su dung Google Gemini de giai dap an cho MCQ va Re-order Paragraph.
 * Da fix loi JSON parsing.
 */

const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Su dung model flash phien ban on dinh nhat
const model = genAI.getGenerativeModel({ 
  model: "gemini-3.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

async function solveWithAI(question) {
  let prompt = "";
  
  if (question.type === 'READING_RE_ORDER_PARAGRAPH') {
    const optionsStr = (question.options || []).map(o => `${o.label}: ${o.text}`).join("\n");
    prompt = `
      You are a PTE Academic expert. Re-order the following paragraphs to create a coherent text.
      PARAGRAPHS:
      ${optionsStr}
      
      Return a JSON array of labels in the correct order. Example: ["B", "A", "D", "C"]
    `;
  } else if (question.type === 'READING_MCQ_SINGLE_ANSWER') {
    const optionsStr = (question.options || []).map(o => `${o.label}: ${o.text}`).join("\n");
    prompt = `
      You are a PTE Academic expert. Solve this Multiple Choice, Choose Single Answer question.
      TEXT: ${question.content}
      QUESTION: ${question.title || "Choose the correct option."}
      OPTIONS:
      ${optionsStr}
      
      Return result in JSON format: { "answer": "LABEL" }
    `;
  } else if (question.type === 'READING_MCQ_MULTIPLE_ANSWER') {
    const optionsStr = (question.options || []).map(o => `${o.label}: ${o.text}`).join("\n");
    prompt = `
      You are a PTE Academic expert. Solve this Multiple Choice, Choose Multiple Answers question.
      TEXT: ${question.content}
      QUESTION: ${question.title || "Choose the correct options."}
      OPTIONS:
      ${optionsStr}
      
      Return a JSON array of labels for all correct options. Example: ["A", "C"]
    `;
  }

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Thu boc tach JSON neu bi lan text
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/\[.*\]|\{.*\}/s);
        if (jsonMatch) {
            data = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Could not find JSON in AI response");
        }
    }
    
    // Chuan hoa ket qua
    if (question.type === 'READING_MCQ_SINGLE_ANSWER') {
        return data.answer || (Array.isArray(data) ? data[0] : data);
    }
    return data;
  } catch (err) {
    console.error(`AI Error for ${question.code}:`, err.message);
    return null;
  }
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  const querySql = `
    SELECT id, code, type, content, title, options 
    FROM questions 
    WHERE type IN ('READING_MCQ_SINGLE_ANSWER', 'READING_MCQ_MULTIPLE_ANSWER', 'READING_RE_ORDER_PARAGRAPH')
      AND ("correctAnswer" IS NULL OR "correctAnswer"::text = 'null' OR "correctAnswer"::text = '[]' OR "correctAnswer"::text = '""')
    ORDER BY type, code
    LIMIT 100
  `;

  const { rows } = await client.query(querySql);
  console.log(`Dang dùng AI giai ${rows.length} cau Reading MCQ & ROP...\n`);

  for (const row of rows) {
    console.log(`Processing ${row.code}...`);
    const answer = await solveWithAI(row);

    if (answer) {
      await client.query(
        `UPDATE questions SET "correctAnswer" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify(answer), row.id]
      );
      console.log(`OK ${row.code}: -> ${JSON.stringify(answer)}`);
    }
    
    await new Promise(r => setTimeout(r, 1500)); // Tranh rate limit
  }

  await client.end();
  console.log("\nHoan tat.");
}

main().catch(console.error);

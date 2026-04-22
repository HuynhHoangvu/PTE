/* eslint-disable no-console */
const { Client } = require("pg");
const path = require("path");
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
  await client.connect();

  console.log("--- Kiem tra 5 cau LFIB dau tien ---");
  const res = await client.query("SELECT code, skill, type, \"updatedAt\" FROM questions WHERE code LIKE 'LFIB%' ORDER BY \"updatedAt\" DESC LIMIT 5");
  console.table(res.rows);

  await client.end();
}

main().catch(err => console.error(err));

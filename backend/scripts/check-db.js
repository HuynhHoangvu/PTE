const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

async function check() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'pte_fly_dev',
  });
  await db.connect();
  const res = await db.query("SELECT * FROM questions WHERE code = 'DI0001'");
  console.log(res.rows[0]);
  await db.end();
}
check().catch(console.error);

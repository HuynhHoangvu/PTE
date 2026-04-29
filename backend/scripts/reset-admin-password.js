const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const email = 'admin@flyedu.com';
  const hash = '$2a$10$CTgV0A8J2m8YyWcVtP1FgOzc4inVLLSMp9zVMtt/lxeRmUiLk5xTO';

  const before = await client.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email],
  );
  console.log(`before_count=${before.rowCount}`);

  const updated = await client.query(
    'UPDATE users SET password = $1 WHERE email = $2',
    [hash, email],
  );
  console.log(`updated=${updated.rowCount}`);

  const after = await client.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email],
  );
  console.log(`after_count=${after.rowCount}`);
  if (after.rowCount > 0) {
    console.log(`after_email=${after.rows[0].email}`);
    console.log(`after_role=${after.rows[0].role}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

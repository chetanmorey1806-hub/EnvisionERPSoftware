/**
 * Applies database/seed.sql (idempotent sample data).
 * Run with:  npm run db:seed   (from the server/ directory)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SEED_FILE = path.join(__dirname, '..', '..', 'database', 'seed.sql');

async function run() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error('[db:seed] database/seed.sql not found.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('[db:seed] Applying database/seed.sql ...');
    await conn.query(fs.readFileSync(SEED_FILE, 'utf8'));
    console.log('[db:seed] Sample data loaded.');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[db:seed] FAILED:', err.code || err.message);
  process.exit(1);
});

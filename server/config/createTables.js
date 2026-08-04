/**
 * One-shot database setup:
 *   1. Executes database/envision_erp.sql (creates DB + tables, idempotent).
 *   2. Seeds a default super-admin account if none exists.
 *
 * Run with:  npm run db:setup   (from the server/ directory)
 *
 * The seeded admin credentials come from env (SEED_ADMIN_EMAIL / _PASSWORD)
 * or fall back to admin@envision.local / Admin@123.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { seedRbac } = require('./seedRbac');
const { runMigrations } = require('./migrations');

const SCHEMA_FILE = path.join(__dirname, '..', '..', 'database', 'envision_erp.sql');
const DB_NAME = process.env.DB_NAME || 'envision_erp';

async function run() {
  // Connect WITHOUT selecting a database and allow multiple statements so the
  // schema file (CREATE DATABASE + CREATE TABLE ...) can run in one shot.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
    console.log('[db:setup] Applying schema from database/envision_erp.sql ...');
    await conn.query(schema);
    await conn.query(`USE \`${DB_NAME}\``);

    // ---- Column migrations for pre-existing tables --------------------------
    await runMigrations(conn, DB_NAME);

    // ---- Roles & permissions (generated, idempotent) ------------------------
    await seedRbac(conn, DB_NAME);

    // ---- Seed default admin -------------------------------------------------
    const email = (process.env.SEED_ADMIN_EMAIL || 'admin@envision.local').toLowerCase();
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      const plain = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
      const hash = await bcrypt.hash(plain, 10);
      await conn.query(
        `INSERT INTO users (name, email, password, role, role_id, status)
         VALUES (?, ?, ?, 'super_admin',
                 (SELECT id FROM roles WHERE name = 'super_admin'), 'active')`,
        ['System Administrator', email, hash]
      );
      console.log(`[db:setup] Seeded super-admin -> ${email} / ${plain}`);
    } else {
      console.log(`[db:setup] Admin already exists (${email}), skipping seed.`);
    }

    // Ensure every user has a role_id (covers the admin seeded above).
    await conn.query(
      'UPDATE users u JOIN roles r ON r.name = u.role SET u.role_id = r.id WHERE u.role_id IS NULL'
    );

    console.log('[db:setup] Done.');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[db:setup] FAILED:', err.code || err.message);
  process.exit(1);
});

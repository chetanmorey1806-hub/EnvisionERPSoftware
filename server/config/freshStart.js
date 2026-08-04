/**
 * db:fresh — wipe every piece of DATA, keep the system.
 *
 *   node config/freshStart.js --yes
 *
 * What survives:
 *   roles, permissions, role_permissions   the RBAC matrix (config, not data)
 *   users                                  ONLY the super-admin from .env
 *   institution_settings                   your institute's own profile row
 *
 * What goes: every student, trainer, staff member, course, batch, fee, payment,
 * document, enquiry, certificate, job, application — everything a person typed
 * or the app generated.
 *
 * This is irreversible, so it refuses to run without --yes, and it prints what
 * it is about to destroy before it does it. Being loud about a destructive
 * command is the whole job.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Config, not data. Wiping these would leave an admin who can log in and do
// nothing, which looks exactly like a broken install.
const KEEP_WHOLE = new Set(['roles', 'permissions', 'role_permissions']);

// Handled specially rather than truncated.
const SPECIAL = new Set(['users', 'institution_settings']);

async function main() {
  const confirmed = process.argv.includes('--yes') || process.env.CONFIRM_FRESH === '1';

  const db = process.env.DB_NAME || 'envision_erp';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@envision.local').toLowerCase();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: db,
    multipleStatements: true,
  });

  const [tables] = await conn.query(
    `SELECT TABLE_NAME AS t FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    [db]
  );
  const names = tables.map((r) => r.t);

  // Count what we are about to destroy, so the operator sees it first.
  const doomed = [];
  for (const t of names) {
    if (KEEP_WHOLE.has(t) || SPECIAL.has(t)) continue;
    const [[c]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    if (Number(c.n) > 0) doomed.push({ table: t, rows: Number(c.n) });
  }
  const [[otherUsers]] = await conn.query('SELECT COUNT(*) AS n FROM users WHERE LOWER(email) <> ?', [adminEmail]);
  const totalRows = doomed.reduce((s, d) => s + d.rows, 0) + Number(otherUsers.n);

  console.log(`\n[db:fresh] database: ${db}`);
  console.log(`[db:fresh] keeping : roles, permissions, role_permissions, institution_settings`);
  console.log(`[db:fresh] keeping : the super-admin account (${adminEmail})`);
  if (totalRows === 0) {
    console.log('[db:fresh] Nothing to delete — the database is already clean.\n');
    await conn.end();
    return;
  }
  console.log(`[db:fresh] DELETING ${totalRows} row(s):`);
  for (const d of doomed) console.log(`             ${d.rows.toString().padStart(6)}  ${d.table}`);
  if (Number(otherUsers.n)) console.log(`             ${String(otherUsers.n).padStart(6)}  users (all except the super-admin)`);

  if (!confirmed) {
    console.log('\n[db:fresh] REFUSED — this is irreversible.');
    console.log('[db:fresh] Re-run with --yes if that is really what you want:\n');
    console.log('             npm run db:fresh -- --yes\n');
    await conn.end();
    process.exitCode = 1;
    return;
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const t of names) {
      if (KEEP_WHOLE.has(t) || SPECIAL.has(t)) continue;
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    // Everyone except the one account that can let you back in.
    await conn.query('DELETE FROM users WHERE LOWER(email) <> ?', [adminEmail]);
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  const [[left]] = await conn.query('SELECT COUNT(*) AS n FROM users');
  const [[perms]] = await conn.query('SELECT COUNT(*) AS n FROM permissions');
  console.log(`\n[db:fresh] Done. ${left.n} user (the admin), ${perms.n} permissions intact.`);
  console.log('[db:fresh] Sign in and create your trainers, placement team and students from Settings → User Management.\n');

  await conn.end();
}

main().catch((err) => {
  console.error('[db:fresh] FAILED:', err.code || err.message);
  process.exit(1);
});

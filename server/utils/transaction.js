/**
 * withTransaction(fn) — run `fn(conn)` inside a MySQL transaction.
 * Commits on success, rolls back on any throw, always releases the connection.
 *
 *   const student = await withTransaction(async (conn) => {
 *     const [r] = await conn.execute('INSERT ...', [...]);
 *     return r.insertId;
 *   });
 *
 * Use the passed `conn` for every statement inside the callback — queries run
 * through the pool helper would land on a different connection and escape the
 * transaction.
 */
const { pool } = require('../config/db');

async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* connection already dead */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };

/**
 * MySQL connection pool (mysql2/promise).
 *
 * The pool is created eagerly, but a failed DB connection does NOT crash the
 * server at boot — endpoints that need the DB will surface a clean 503 instead.
 * Call testConnection() at startup to log the status.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'envision_erp',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  dateStrings: true,
  namedPlaceholders: false,
});

let connected = false;

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    connected = true;
    return true;
  } catch (err) {
    connected = false;
    // eslint-disable-next-line no-console
    console.error(`[db] Connection failed: ${err.code || err.message}`);
    return false;
  }
}

/**
 * Thin query helper. Returns rows for SELECT, or the ResultSetHeader otherwise.
 */
async function query(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

function isConnected() {
  return connected;
}

module.exports = { pool, query, testConnection, isConnected };

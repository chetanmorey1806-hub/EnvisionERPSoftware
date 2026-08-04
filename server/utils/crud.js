/**
 * Small raw-SQL helpers shared by the module controllers.
 * Table/column names are always code-provided constants (never user input),
 * while all VALUES are passed as bound parameters — safe from injection.
 */
const { query } = require('../config/db');

/** Keep only whitelisted keys that are actually present in the body. */
function pick(body = {}, fields = []) {
  const out = {};
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out;
}

async function insert(table, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    const e = new Error('No valid fields provided.');
    e.status = 422;
    throw e;
  }
  const cols = keys.map((k) => `\`${k}\``).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const result = await query(
    `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`,
    keys.map((k) => data[k])
  );
  return result.insertId;
}

async function update(table, id, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  const assignments = keys.map((k) => `\`${k}\` = ?`).join(', ');
  const result = await query(
    `UPDATE \`${table}\` SET ${assignments} WHERE id = ?`,
    [...keys.map((k) => data[k]), id]
  );
  return result.affectedRows;
}

async function findById(table, id) {
  const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findAll(table, { orderBy = 'id DESC', where = '', params = [] } = {}) {
  const clause = where ? ` WHERE ${where}` : '';
  return query(`SELECT * FROM \`${table}\`${clause} ORDER BY ${orderBy}`, params);
}

async function remove(table, id) {
  const result = await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
  return result.affectedRows;
}

module.exports = { pick, insert, update, findById, findAll, remove, query };

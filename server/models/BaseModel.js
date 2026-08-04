/**
 * BaseModel — a thin, reusable raw-SQL data-access class over a single table.
 *
 *   const Course = new BaseModel('courses', ['code', 'title', 'fee']);
 *   await Course.findAll();
 *   await Course.create({ code, title });   // only whitelisted (fillable) keys persist
 *
 * Table/column names come from code (never request input); every value is a
 * bound parameter, so this is safe from SQL injection.
 */
const { query } = require('../config/db');

class BaseModel {
  constructor(table, fillable = []) {
    this.table = table;
    this.fillable = fillable;
  }

  /** Keep only whitelisted keys present in the payload. */
  pick(data = {}) {
    const out = {};
    for (const f of this.fillable) {
      if (data[f] !== undefined) out[f] = data[f];
    }
    return out;
  }

  async findAll({ where = '', params = [], orderBy = 'id DESC', limit, offset } = {}) {
    const clause = where ? ` WHERE ${where}` : '';
    let sql = `SELECT * FROM \`${this.table}\`${clause} ORDER BY ${orderBy}`;
    const bound = [...params];
    if (limit !== undefined) {
      // MySQL prepared statements reject LIMIT/OFFSET as bound parameters, so
      // coerce to safe integers and inline. Values never come from raw input.
      const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);
      const off = Math.max(parseInt(offset, 10) || 0, 0);
      sql += ` LIMIT ${lim} OFFSET ${off}`;
    }
    return query(sql, bound);
  }

  async findById(id) {
    const rows = await query(`SELECT * FROM \`${this.table}\` WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findOne(where, params = []) {
    const rows = await query(`SELECT * FROM \`${this.table}\` WHERE ${where} LIMIT 1`, params);
    return rows[0] || null;
  }

  async exists(id) {
    const rows = await query(`SELECT id FROM \`${this.table}\` WHERE id = ? LIMIT 1`, [id]);
    return rows.length > 0;
  }

  async count(where = '', params = []) {
    const clause = where ? ` WHERE ${where}` : '';
    const rows = await query(`SELECT COUNT(*) AS c FROM \`${this.table}\`${clause}`, params);
    return rows[0].c;
  }

  async create(data) {
    const payload = this.pick(data);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      const e = new Error('No valid fields provided.');
      e.status = 422;
      throw e;
    }
    const cols = keys.map((k) => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const result = await query(
      `INSERT INTO \`${this.table}\` (${cols}) VALUES (${placeholders})`,
      keys.map((k) => payload[k])
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const payload = this.pick(data);
    const keys = Object.keys(payload);
    if (keys.length === 0) return this.findById(id);
    const assignments = keys.map((k) => `\`${k}\` = ?`).join(', ');
    await query(`UPDATE \`${this.table}\` SET ${assignments} WHERE id = ?`, [
      ...keys.map((k) => payload[k]),
      id,
    ]);
    return this.findById(id);
  }

  async remove(id) {
    const result = await query(`DELETE FROM \`${this.table}\` WHERE id = ?`, [id]);
    return result.affectedRows;
  }

  /** Escape hatch for joins / aggregates that don't fit the single-table CRUD shape. */
  raw(sql, params = []) {
    return query(sql, params);
  }
}

module.exports = BaseModel;

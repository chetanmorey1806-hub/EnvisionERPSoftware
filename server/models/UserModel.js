/**
 * UserModel — raw SQL data access for the `users` table (mysql2).
 *
 * `SAFE_FIELDS` is the column list returned to clients (never includes the
 * password hash or reset token). Use findByEmailWithSecret() only for auth.
 */
const { query } = require('../config/db');

const SAFE_FIELDS =
  'id, name, email, role, phone, avatar, status, last_login_at, created_at, updated_at';

const UserModel = {
  /** Full row including password hash — for login verification only. */
  async findByEmailWithSecret(email) {
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [
      String(email).toLowerCase(),
    ]);
    return rows[0] || null;
  },

  /** Public-safe user by id (no secrets). */
  async findById(id) {
    const rows = await query(
      `SELECT ${SAFE_FIELDS} FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async existsByEmail(email) {
    const rows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [
      String(email).toLowerCase(),
    ]);
    return rows.length > 0;
  },

  /** Insert a new user; returns the public-safe created row. */
  async create({ name, email, passwordHash, role = 'staff', phone = null }) {
    const result = await query(
      `INSERT INTO users (name, email, password, role, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [name, String(email).toLowerCase(), passwordHash, role, phone]
    );
    return UserModel.findById(result.insertId);
  },

  async updateLastLogin(id) {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  async setResetToken(id, token, expiresAt) {
    await query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expiresAt, id]
    );
  },

  async findByResetToken(token) {
    const rows = await query(
      `SELECT * FROM users
       WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  },

  async updatePassword(id, passwordHash) {
    await query(
      `UPDATE users
       SET password = ?, reset_token = NULL, reset_token_expires = NULL
       WHERE id = ?`,
      [passwordHash, id]
    );
  },
};

module.exports = UserModel;

/**
 * NotificationModel — per-user notifications.
 * Role/broadcast notifications are fanned out to individual user rows so each
 * user has independent read state.
 */
const { query } = require('../config/db');

const NotificationModel = {
  async create({ user_id, type = 'info', title, message = null, link = null }) {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, type, title, message, link]
    );
    const rows = await query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  listForUser(userId, limit = 50) {
    // MySQL prepared statements do not accept LIMIT as a bound parameter
    // ("Incorrect arguments to mysqld_stmt_execute"), so the value is coerced
    // to a safe integer and inlined. `userId` stays parameterised.
    const n = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    return query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ${n}`,
      [userId]
    );
  },

  async unreadCount(userId) {
    const rows = await query(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].c;
  },

  async markRead(id, userId) {
    const result = await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows;
  },

  async markAllRead(userId) {
    const result = await query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return result.affectedRows;
  },

  /** Active user ids for the given roles (used to fan out role notifications). */
  async userIdsByRoles(roles) {
    if (!roles.length) return [];
    const placeholders = roles.map(() => '?').join(', ');
    const rows = await query(
      `SELECT id FROM users WHERE role IN (${placeholders}) AND status = 'active'`,
      roles
    );
    return rows.map((r) => r.id);
  },
};

module.exports = NotificationModel;

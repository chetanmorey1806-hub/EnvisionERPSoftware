/**
 * RoleModel — roles, permissions and their mapping (all DB-driven).
 */
const { query } = require('../config/db');

const RoleModel = {
  /** All roles with a live permission count and user count. */
  listWithCounts() {
    return query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count,
              (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id)              AS user_count
       FROM roles r ORDER BY r.id ASC`
    );
  },

  async findById(id) {
    const rows = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findByName(name) {
    const rows = await query('SELECT * FROM roles WHERE name = ? LIMIT 1', [name]);
    return rows[0] || null;
  },

  async create({ name, label, description = null }) {
    const r = await query(
      'INSERT INTO roles (name, label, description, is_system) VALUES (?, ?, ?, 0)',
      [name, label, description]
    );
    return RoleModel.findById(r.insertId);
  },

  async update(id, { label, description }) {
    await query('UPDATE roles SET label = COALESCE(?, label), description = ? WHERE id = ?', [
      label ?? null,
      description ?? null,
      id,
    ]);
    return RoleModel.findById(id);
  },

  async remove(id) {
    const r = await query('DELETE FROM roles WHERE id = ? AND is_system = 0', [id]);
    return r.affectedRows;
  },

  /** All permissions, ordered for grouping by module. */
  allPermissions() {
    return query('SELECT * FROM permissions ORDER BY module ASC, action ASC');
  },

  /** Permission names granted to a role. */
  async permissionNamesForRole(roleId) {
    const rows = await query(
      `SELECT p.name FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [roleId]
    );
    return rows.map((r) => r.name);
  },

  /** Replace a role's permission set with the given permission names. */
  async setPermissions(roleId, permissionNames = []) {
    await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    if (!permissionNames.length) return 0;

    const placeholders = permissionNames.map(() => '?').join(', ');
    const perms = await query(
      `SELECT id FROM permissions WHERE name IN (${placeholders})`,
      permissionNames
    );
    for (const p of perms) {
      await query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [
        roleId,
        p.id,
      ]);
    }
    return perms.length;
  },

  /** Resolve the effective permission names for a user (via their role). */
  async permissionNamesForUser(userId) {
    const rows = await query(
      `SELECT p.name FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = ?`,
      [userId]
    );
    return rows.map((r) => r.name);
  },
};

module.exports = RoleModel;

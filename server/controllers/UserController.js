/**
 * UserController — admin management of platform users (/api/users).
 *
 * This is how a trainer, a placement officer or a student comes to exist. Two
 * things must happen together, or the account is broken in a way that is hard
 * to diagnose:
 *
 *   1. the `users` row  — grants LOGIN
 *   2. the domain row   — grants IDENTITY (faculty.user_id / students.user_id)
 *
 * The portals resolve "who am I" from the domain table, so a trainer with only
 * a users row can sign in and then 403 on every trainer endpoint. Creating one
 * without the other is the bug; this controller does both.
 *
 * Never returns password or reset-token fields.
 */
const bcrypt = require('bcrypt');
const { pick, update, findById, query } = require('../utils/crud');
const { provisionProfile } = require('../services/ProfileProvisioningService');
const { success, created, fail } = require('../utils/response');

const SAFE =
  'id, name, email, role, phone, avatar, status, login_enabled, is_verified, last_login_at, created_at';
const EDITABLE = ['name', 'email', 'phone', 'role', 'status'];

const UserController = {
  // GET /users
  async getAll(req, res) {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.status,
              u.login_enabled, u.is_verified, u.last_login_at, u.created_at,
              r.label AS role_label,
              f.id AS faculty_id, s.id AS student_id
       FROM users u
       LEFT JOIN roles r    ON r.id = u.role_id
       LEFT JOIN faculty f  ON f.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       ORDER BY u.id DESC`
    );
    return success(res, { data: rows }, 'Users fetched.');
  },

  // GET /users/roles — what an admin may assign
  async getRoles(req, res) {
    const rows = await query('SELECT id, name, label, description FROM roles ORDER BY id');
    return success(res, { data: rows }, 'Roles fetched.');
  },

  // GET /users/:id
  async getById(req, res) {
    const rows = await query(`SELECT ${SAFE} FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return fail(res, 'User not found.', 404);
    return success(res, { data: rows[0] }, 'User fetched.');
  },

  // POST /users  { name, email, password, role, phone }
  async create(req, res) {
    const { name, email, password, role, phone } = req.body || {};
    if (!name || !email || !password) return fail(res, 'Name, email and password are required.', 422);

    const mail = String(email).trim().toLowerCase();

    // A clean 409 beats a raw duplicate-key 500.
    const [dupe] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [mail]);
    if (dupe) return fail(res, 'An account with that email already exists.', 409);

    const [roleRow] = await query('SELECT id, name, label FROM roles WHERE name = ? LIMIT 1', [role || 'staff']);
    if (!roleRow) return fail(res, `Unknown role '${role}'.`, 422);

    const passwordHash = await bcrypt.hash(password, 10);

    // role_id must be set, or permissionNamesForUser() joins on NULL and the
    // account silently ends up with ZERO permissions.
    const result = await query(
      `INSERT INTO users (name, email, password, role, role_id, phone, status, is_verified, login_enabled)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 1)`,
      [name.trim(), mail, passwordHash, roleRow.name, roleRow.id, phone || null]
    );

    const [user] = await query(`SELECT ${SAFE} FROM users WHERE id = ?`, [result.insertId]);

    // The half that is usually forgotten: give a trainer their faculty row and
    // a student their students row, so their portal can actually resolve them.
    const profile = await provisionProfile({
      id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
    });

    return created(res, { data: { ...user, profile } },
      profile.id
        ? `${roleRow.label} account created, with a ${profile.type} profile.`
        : `${roleRow.label} account created.`);
  },

  // PUT /users/:id
  async update(req, res) {
    if (!(await findById('users', req.params.id))) return fail(res, 'User not found.', 404);

    if (req.body?.email) {
      const mail = String(req.body.email).trim().toLowerCase();
      const [dupe] = await query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [mail, req.params.id]);
      if (dupe) return fail(res, 'Another account already uses that email.', 409);
      req.body.email = mail;
    }

    await update('users', req.params.id, pick(req.body, EDITABLE));

    // Keep role_id in lock-step with the role name.
    if (req.body?.role) {
      await query('UPDATE users u JOIN roles r ON r.name = u.role SET u.role_id = r.id WHERE u.id = ?', [req.params.id]);
    }
    const [user] = await query(`SELECT ${SAFE} FROM users WHERE id = ?`, [req.params.id]);
    return success(res, { data: user }, 'User updated.');
  },

  /**
   * PATCH /users/:id/password  { password }
   * An admin resetting someone's password. Deliberately does NOT ask for the
   * old one — that is the entire point of an admin reset.
   */
  async setPassword(req, res) {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return fail(res, 'The new password must be at least 6 characters.', 422);
    }
    if (!(await findById('users', req.params.id))) return fail(res, 'User not found.', 404);

    const hash = await bcrypt.hash(String(password), 10);
    await query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, req.params.id]
    );
    return success(res, {}, 'Password reset. Share it over a channel the user trusts.');
  },

  /**
   * PATCH /users/:id/login  { enabled }
   * Turning sign-in off keeps the account and its history but locks the door —
   * which is what you want when someone leaves, rather than deleting the row
   * and orphaning everything they ever touched.
   */
  async setLoginEnabled(req, res) {
    const enabled = req.body?.enabled === true || req.body?.enabled === 1 || req.body?.enabled === '1';

    if (Number(req.params.id) === Number(req.user?.id) && !enabled) {
      return fail(res, 'You cannot disable your own sign-in.', 400);
    }
    if (!(await findById('users', req.params.id))) return fail(res, 'User not found.', 404);

    await query('UPDATE users SET login_enabled = ? WHERE id = ?', [enabled ? 1 : 0, req.params.id]);
    const [user] = await query(`SELECT ${SAFE} FROM users WHERE id = ?`, [req.params.id]);
    return success(res, { data: user }, enabled ? 'Sign-in enabled.' : 'Sign-in disabled.');
  },

  // GET /users/:id/permissions — what this account can actually do
  async permissions(req, res) {
    const rows = await query(
      `SELECT p.name, p.module, p.action
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p       ON p.id = rp.permission_id
       WHERE u.id = ?
       ORDER BY p.module, p.action`,
      [req.params.id]
    );
    const modules = {};
    for (const p of rows) {
      modules[p.module] = modules[p.module] || [];
      modules[p.module].push(p.action);
    }
    return success(res, { data: { total: rows.length, modules } }, 'Permissions fetched.');
  },

  // DELETE /users/:id
  async delete(req, res) {
    if (Number(req.params.id) === Number(req.user?.id)) {
      return fail(res, 'You cannot delete your own account.', 400);
    }
    const [user] = await query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return fail(res, 'User not found.', 404);

    // The last super admin must not be able to lock everyone out of the system.
    if (user.role === 'super_admin') {
      const [count] = await query("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin'");
      if (Number(count.n) <= 1) {
        return fail(res, 'This is the last super admin — deleting it would lock everyone out.', 409);
      }
    }

    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    return success(res, {}, 'User deleted. Their trainer/student record was kept, just unlinked.');
  },
};

module.exports = UserController;

/**
 * resolveStudent — attaches the `students` row linked to the logged-in user.
 *
 * This is the authorization primitive for every `/students/me/*` route:
 * ownership is derived from the JWT, never from a client-supplied id, so there
 * is no id for a student to tamper with.
 */
const { query } = require('../config/db');
const { fail } = require('../utils/response');

module.exports = async function resolveStudent(req, res, next) {
  try {
    const rows = await query('SELECT * FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (!rows[0]) {
      return fail(res, 'No student profile is linked to this account.', 403);
    }
    req.student = rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
};

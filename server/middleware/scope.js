/**
 * Ownership-aware authorization.
 *
 * `can('attendance.view')` answers "may this role read attendance?" — it cannot
 * answer "*whose* attendance?". A student holds `attendance.view` so they can
 * see their own record, but that same grant would otherwise let them read every
 * other student's record by changing the id in the URL.
 *
 * selfOrCan() closes that: staff pass on the permission, a student passes only
 * on their OWN id. The id is compared against the students row linked to the
 * JWT, never against anything the client sent.
 */
const { query } = require('../config/db');
const { fail } = require('../utils/response');
const RoleModel = require('../models/RoleModel');

/**
 * @param {string} permission  grant that lets a non-owner through (e.g. 'results.view')
 * @param {string} param       route param holding the student id (default 'studentId')
 */
function selfOrCan(permission, param = 'studentId') {
  return async (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required.', 401);
    if (req.user.role === 'super_admin') return next();

    try {
      const [own] = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);

      // A caller who IS a student is judged ONLY by ownership. Falling through
      // to the permission check would let them read any record, since the
      // student role holds `.view` precisely so it can read its own.
      if (own) {
        return String(own.id) === String(req.params[param])
          ? next()
          : fail(res, 'You can only view your own record.', 403);
      }

      const granted = await RoleModel.permissionNamesForUser(req.user.id);
      if (granted.includes(permission)) {
        req.permissions = granted;
        return next();
      }
      return fail(res, `Missing permission: ${permission}.`, 403);
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { selfOrCan };

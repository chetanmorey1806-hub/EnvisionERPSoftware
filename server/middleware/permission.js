/**
 * Permission middleware — DB-driven RBAC.
 *
 *   router.post('/', authenticate, can('students.create'), handler)
 *   router.get('/',  authenticate, can('reports.view', 'reports.export'), handler) // ANY of
 *
 * `super_admin` bypasses all checks. Permissions come from the user's role via
 * role_permissions, so changing a role's grants takes effect immediately — no
 * code change and no redeploy.
 */
const RoleModel = require('../models/RoleModel');
const { fail } = require('../utils/response');

function can(...required) {
  return async (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required.', 401);
    if (req.user.role === 'super_admin') return next();

    try {
      const granted = await RoleModel.permissionNamesForUser(req.user.id);
      const ok = required.some((p) => granted.includes(p));
      if (!ok) {
        return fail(res, `Missing permission: ${required.join(' or ')}.`, 403, {
          required,
        });
      }
      req.permissions = granted;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { can };

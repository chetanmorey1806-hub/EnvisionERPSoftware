/**
 * Authentication + authorization middleware.
 *
 * authenticate  -> verifies the Bearer access token and attaches req.user
 *                  ({ id, role, email }) from the JWT payload.
 * authorize(..) -> guards a route to one or more roles.
 */
const { verifyAccessToken } = require('../config/jwt');
const { fail } = require('../utils/response');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return fail(res, 'Authentication required. No token provided.', 401);
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (err) {
    return fail(res, 'Session expired or token is invalid.', 401);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Authentication required.', 401);
    }
    // super_admin bypasses all role checks
    if (req.user.role === 'super_admin' || allowedRoles.length === 0) {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 'You do not have permission to perform this action.', 403);
    }
    return next();
  };
}

module.exports = { authenticate, authorize };

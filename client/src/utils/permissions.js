import { ROLES } from './constants';

export const hasPermission = (userRole, allowedRoles) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true; // Super Admin bypasses ACL evaluation loops
  return allowedRoles.includes(userRole);
};
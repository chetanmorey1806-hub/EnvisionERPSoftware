import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Permission helpers driven by the permissions the API returns on login/me.
 *
 *   const { can, canAny, isSuperAdmin } = usePermissions();
 *   {can('students.create') && <Button>Add student</Button>}
 */
export const usePermissions = () => {
  const { user } = useContext(AuthContext);

  return useMemo(() => {
    const granted = user?.permissions || [];
    const isSuperAdmin = user?.role === 'super_admin';

    const can = (permission) => isSuperAdmin || granted.includes(permission);
    const canAny = (...permissions) => permissions.some(can);
    const canAll = (...permissions) => permissions.every(can);

    return { permissions: granted, can, canAny, canAll, isSuperAdmin, role: user?.role };
  }, [user]);
};

export default usePermissions;

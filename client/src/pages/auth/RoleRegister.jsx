import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';
import AuthShell from './AuthShell';
import { Icons } from '../../components/common/icons';
import { getPortal } from '../../config/authRoles';

/**
 * Per-role registration. The role is LOCKED to the portal, so a Student form
 * can only create a student and a Trainer form only a trainer. Admin cannot
 * self-register — the server enforces it too; here we simply explain why.
 */
const RoleRegister = () => {
  const { role } = useParams();
  const portal = getPortal(role);
  if (!portal) return <Navigate to="/register" replace />;

  if (!portal.canRegister) {
    return (
      <AuthShell portal={portal} title={`${portal.label} registration`} backTo="/register">
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gray-100 dark:bg-slate-800">
            <Icons.roles size={26} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Administrator accounts are <b>provisioned internally</b> and cannot be self-registered.
          </p>
          <p className="text-xs text-gray-400">
            Please contact your system administrator to have an admin account created for you.
          </p>
          <Link to="/login/admin"
            className="inline-block mt-2 px-4 py-2.5 min-h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold press">
            Go to Admin login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell portal={portal} title={`Register as ${portal.label}`}
      subtitle="We'll email you a 6-digit code to verify your address." backTo="/register">
      <RegisterForm lockedRole={portal.backendRole} solidBtn={portal.solid} accentText={portal.text} />
      <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-4">
        Already registered?{' '}
        <Link to={`/login/${portal.slug}`} className={`font-semibold ${portal.text} hover:underline`}>Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default RoleRegister;

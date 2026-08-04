import React, { useContext, useState } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import AuthShell from './AuthShell';
import { getPortal, portalForRole } from '../../config/authRoles';

/**
 * Per-role login. Functionally identical for every role (same /auth/login),
 * but themed per portal and — as a friendly guard — it warns if you signed in
 * through the wrong door (e.g. a student using the Trainer portal). The account
 * still logs in; the role is authoritative, the door is just navigation.
 */
const RoleLogin = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { applySession } = useContext(AuthContext);
  const portal = getPortal(role);

  const [creds, setCreds] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!portal) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authApi.login(creds);
      const user = res.data.user;
      const belongs = portalForRole(user.role);

      // Wrong door → send them to their real portal, but still sign them in.
      if (belongs && belongs.slug !== portal.slug) {
        applySession(res.data.token, user);
        navigate('/dashboard', { replace: true });
        return;
      }
      applySession(res.data.token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell portal={portal} title={`${portal.label} login`} subtitle="Enter your credentials to continue.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <Input label="Email" type="email" name="email" required placeholder="name@institution.com"
          value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} />
        <Input label="Password" type="password" name="password" required placeholder="••••••••"
          value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} />

        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className={`text-xs font-medium ${portal.text} hover:underline`}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading}
          className={`w-full min-h-11 rounded-lg text-white text-sm font-bold transition press disabled:opacity-60 shadow-sm ${portal.solid} ${portal.ring} focus:outline-none focus:ring-2`}>
          {loading ? 'Signing in…' : `Sign in as ${portal.label}`}
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-slate-400">
          {portal.canRegister ? (
            <>New here? <Link to={`/register/${portal.slug}`} className={`font-semibold ${portal.text} hover:underline`}>Create an account</Link></>
          ) : (
            <span className="text-gray-400">Administrator accounts are provisioned internally.</span>
          )}
        </p>
      </form>
    </AuthShell>
  );
};

export default RoleLogin;

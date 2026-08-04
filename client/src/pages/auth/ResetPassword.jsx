import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ResetPasswordForm from '../../components/auth/ResetPassword';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-900">
        <div className="text-center">
          <span className="text-3xl">🔄</span>
          <h2 className="mt-3 text-xl font-black text-gray-900 dark:text-slate-100">Overwrite Security Access</h2>
        </div>
        <ResetPasswordForm token={token} onComplete={() => navigate('/login')} />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
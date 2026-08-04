import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../../components/auth/RegisterForm';

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-900">
        <div className="text-center">
          <span className="text-3xl select-none">⚙️</span>
          <h2 className="mt-3 text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
            Provision Node Profile
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Initialize access metrics onto the primary institutional administrative node cluster.
          </p>
        </div>

        <RegisterForm onSuccessRedirection={() => navigate('/login')} />

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Already mapped?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Authenticate Existing Gateway
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../common/Input';
import Button from '../common/Button';

const LoginForm = ({ onForgotPasswordClick }) => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(credentials);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid system access authorization keys.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium">{error}</div>}
      
      <Input label="Business Email" type="email" name="email" value={credentials.email} onChange={handleChange} required placeholder="name@institution.com" />
      <Input label="Security Password" type="password" name="password" value={credentials.password} onChange={handleChange} required placeholder="••••••••" />

      <div className="flex items-center justify-end">
        <button type="button" onClick={onForgotPasswordClick} className="text-xs text-brand-600 hover:underline">Forgot Access Key?</button>
      </div>

      <Button type="submit" variant="primary" loading={loading} className="w-full">Authorize & Secure Entry</Button>
    </form>
  );
};

export default LoginForm;
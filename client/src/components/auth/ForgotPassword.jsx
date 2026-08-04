import React, { useState } from 'react';
import { authApi } from '../../api/authApi';
import Input from '../common/Input';
import Button from '../common/Button';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setMessage('Reset link dispatch completed. Audit your inbox vector.');
    } catch (err) {
      setMessage('Identification parsing mapping lookup mismatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">Provide verified system tracking email parameters to deploy password reset maps.</p>
      {message && <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-xs">{message}</div>}
      <Input label="Recovery Vector Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" loading={loading} className="w-full">Request Vector Tokens</Button>
      <button type="button" onClick={onBackToLogin} className="text-xs text-gray-500 block w-full text-center hover:underline">Return to Portal Gate</button>
    </form>
  );
};

export default ForgotPassword;
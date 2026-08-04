import React, { useState } from 'react';
import { authApi } from '../../api/authApi';
import Input from '../common/Input';
import Button from '../common/Button';

const ResetPassword = ({ token, onComplete }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      onComplete();
    } catch (err) {
      alert('Token reference payload expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Define New Security Passkey" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Button type="submit" loading={loading} className="w-full">Commit Sequence Overwrite</Button>
    </form>
  );
};

export default ResetPassword;
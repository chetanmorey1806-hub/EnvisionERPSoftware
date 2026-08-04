import React, { useState } from 'react';
import { authApi } from '../../api/authApi';
import Input from '../common/Input';
import Button from '../common/Button';

const OTPVerification = ({ sessionToken, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOTP({ sessionToken, otp });
      onVerified();
    } catch (err) {
      setError('Token decryption mismatch. Code rejected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">Provide 6-digit cryptographic verification pass token deployed via automated notification.</p>
      {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs">{error}</div>}
      <Input label="Enter Verification Passcode" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="000000" maxLength={6} />
      <Button type="submit" loading={loading} className="w-full">Confirm Encryption Key</Button>
    </form>
  );
};

export default OTPVerification;
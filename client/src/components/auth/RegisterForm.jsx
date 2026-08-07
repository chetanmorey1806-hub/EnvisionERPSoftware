import React, { useContext, useEffect, useState } from 'react';
import { authApi } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';
import Input from '../common/Input';
import { Icons } from '../common/icons';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Trainer / Faculty' },
  { value: 'staff', label: 'Staff' },
];

/**
 * Two-step sign-up:
 *   1. details -> POST /auth/register   (creates an UNVERIFIED account, emails a code)
 *   2. otp     -> POST /auth/verify-otp (verifies, returns a token, signs in)
 *
 * No token is issued until the emailed code is confirmed, so nobody can sign up
 * with an address they don't control.
 */
const RegisterForm = ({ onSuccessRedirection, lockedRole, solidBtn = 'bg-brand-600 hover:bg-brand-700', accentText = 'text-brand-600' }) => {
  const { applySession } = useContext(AuthContext);
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: lockedRole || 'student' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const register = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authApi.register(form);
      setInfo(`We emailed a 6-digit code to ${form.email}. It expires in ${res.data.expiresInMinutes} minutes.`);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authApi.verifyOTP({ email: form.email, code });
      // The API returns a token + user — sign in immediately.
      if (applySession) applySession(res.data.token, res.data.user);
      else onSuccessRedirection?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setError('');
    try {
      await authApi.resendOTP(form.email);
      setInfo('A new code has been sent.');
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to resend the code.');
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={verify} className="space-y-4">
        {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-lg text-xs">{error}</div>}
        {info && <div className="p-3 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 rounded-lg text-xs">{info}</div>}

        <div className="text-center py-2">
          <Icons.mail size={32} strokeWidth={1.6} className="mx-auto text-brand-500 mb-2" />
          <p className="text-xs text-gray-500 dark:text-slate-400">Enter the 6-digit code we sent you.</p>
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-label="Verification code"
          className="w-full text-center text-2xl font-black tracking-[0.5em] py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none"
        />

        <button type="submit" disabled={loading || code.length !== 6}
          className={`w-full min-h-11 rounded-lg text-white text-sm font-bold transition press disabled:opacity-50 shadow-sm ${solidBtn}`}>
          {loading ? 'Verifying…' : 'Verify & continue'}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => { setStep('details'); setError(''); setInfo(''); }}
            className="text-gray-500 hover:underline">← Change details</button>
          <button type="button" onClick={resend} disabled={cooldown > 0}
            className={`font-semibold ${accentText} hover:underline disabled:opacity-40 disabled:no-underline`}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={register} className="space-y-1">
      {error && <div className="p-3 mb-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-lg text-xs">{error}</div>}

      <Input label="Full name" name="name" value={form.name} required
        onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Email" type="email" name="email" value={form.email} required
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input label="Phone (for WhatsApp)" name="phone" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
      <Input label="Password" type="password" name="password" value={form.password} required
        onChange={(e) => setForm({ ...form, password: e.target.value })} />

      {!lockedRole && (
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400">I am a</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full text-sm px-3.5 py-2.5 min-h-11 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}

      <button type="submit" disabled={loading}
        className={`w-full min-h-11 rounded-lg text-white text-sm font-bold transition press disabled:opacity-60 shadow-sm ${solidBtn}`}>
        {loading ? 'Creating…' : 'Create account'}
      </button>
      <p className="text-[10px] text-center text-gray-400 pt-2">
        We&apos;ll email you a 6-digit code to verify your address.
      </p>
    </form>
  );
};

export default RegisterForm;

import React, { useEffect, useState } from 'react';
import { PageHero } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { attendanceApi } from '../../api/attendanceApi';
import { useT } from '../../context/LanguageContext';

/**
 * My Attendance (student) — self check-in.
 *
 * A student can mark themselves present, but ONLY while their trainer has
 * check-in open and ONLY by entering the code shown in class. The code is the
 * proof they are physically in the room — so this page does nothing on its own;
 * it just carries the code to the server, which decides.
 */
const MyAttendance = () => {
  const { t } = useT();
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const r = await attendanceApi.myStatus();
      setStatus(r.data.data);
    } catch (e) { setError(e?.response?.data?.message || 'Unable to load attendance.'); }
  };
  useEffect(() => { load(); }, []);

  const checkIn = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await attendanceApi.checkIn(code.trim());
      setNotice(r.data.message);
      setCode('');
      load();
    } catch (e) { setError(e?.response?.data?.message || 'Check-in failed.'); }
    finally { setBusy(false); }
  };

  const today = status?.today;
  const openSession = status?.open_session;

  return (
    <div className="space-y-5 max-w-xl">
      <PageHero
        tone="violet"
        icon={Icons.attendance}
        title="My Attendance"
        subtitle="Mark yourself present when your trainer opens check-in."
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs font-medium">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">{notice}</div>}

      {/* Overall percentage */}
      <div className="p-5 rounded-xl erp-card">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('Overall attendance')}</p>
        <p className={`text-3xl font-black mt-1 ${
          (status?.percentage ?? 0) >= 85 ? 'text-emerald-600' : (status?.percentage ?? 0) >= 60 ? 'text-amber-500' : 'text-rose-600'
        }`}>{status?.percentage ?? 0}%</p>
        <p className="text-[11px] text-gray-400">{t('across')} {status?.total ?? 0} {t('sessions')}</p>
      </div>

      {/* Today */}
      <div className="p-5 rounded-xl erp-card">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('Today')}</p>

        {today ? (
          <div className="flex items-center gap-2">
            <Icons.success size={18} className={today.status === 'present' ? 'text-emerald-600' : 'text-rose-600'} />
            <span className="text-sm font-bold text-gray-800 dark:text-slate-100">
              {t(today.status)}
            </span>
            <span className="text-[11px] text-gray-400">
              ({today.source === 'self' ? t('you checked in') : t('marked by your trainer')})
            </span>
          </div>
        ) : openSession ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {t('Check-in is open for')} <b>{openSession.batch_name}</b>. {t('Enter the code your trainer showed in class.')}
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="______"
                className="flex-1 px-3 py-3 text-center text-xl font-black tracking-[0.4em] tabular-nums bg-white dark:bg-slate-900 border-2 border-brand-200 dark:border-brand-900 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button onClick={checkIn} disabled={busy || code.length < 6}
                className="px-5 py-3 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50">
                {busy ? t('…') : t('Check in')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {t('Check-in is not open right now. Your trainer opens it in class.')}
          </p>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;

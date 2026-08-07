import React, { useCallback, useEffect, useState } from 'react';
import { PageHero } from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { Icons } from '../../components/common/icons';
import { adminApi } from '../../api/adminApi';
import ContactActions from '../../components/common/ContactActions';

const Stars = ({ value }) => {
  if (value == null) return <span className="text-gray-300 text-xs">no data</span>;
  const v = Number(value);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs font-black text-gray-800 dark:text-slate-100">{v.toFixed(2)}</span>
      <span className="flex" aria-label={`${v} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icons.star key={i} size={11}
            className={i <= Math.round(v) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700'} />
        ))}
      </span>
    </span>
  );
};

const Metric = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
    <dd className="text-xs font-semibold text-gray-700 dark:text-slate-300 mt-0.5">
      {value == null ? '—' : Number(value).toFixed(2)}
    </dd>
  </div>
);

const TrainerPerformance = () => {
  const [data, setData] = useState(null);
  const [comments, setComments] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [broadcast, setBroadcast] = useState(null);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };

  const load = useCallback(() => {
    adminApi.trainerFeedback()
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load feedback.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const trigger = async (key, fn) => {
    setBusy(key); setError('');
    try { const r = await fn(); flash(r.data.message); }
    catch (e) { setError(e.response?.data?.message || 'Trigger failed.'); }
    finally { setBusy(''); }
  };

  const openComments = async (t) => {
    setComments({ trainer: t, rows: null });
    const r = await adminApi.trainerComments(t.trainer_id);
    setComments({ trainer: t, rows: r.data.data });
  };

  const sendBroadcast = async () => {
    setBusy('broadcast');
    try {
      const r = await adminApi.broadcast(broadcast);
      flash(r.data.message); setBroadcast(null);
    } catch (e) { setError(e.response?.data?.message || 'Broadcast failed.'); }
    finally { setBusy(''); }
  };

  const TRIGGERS = [
    { key: 'fee', label: 'Fee reminders', icon: Icons.fees, fn: adminApi.feeReminders, hint: 'Students with an outstanding balance' },
    { key: 'att', label: 'Attendance warnings', icon: Icons.warning, fn: adminApi.attendanceWarnings, hint: 'Below 75% attendance' },
    { key: 'fb', label: 'Low-feedback alerts', icon: Icons.star, fn: adminApi.lowFeedbackAlerts, hint: 'Trainers rated under 3.5' },
    { key: 'daily', label: 'Run all (daily)', icon: Icons.clock, fn: adminApi.runDaily, hint: 'Same as the nightly cron' },
  ];

  return (
    <div className="space-y-5">
      <PageHero
        tone="green"
        icon={Icons.star}
        title="Trainer Performance & Communications"
        subtitle="Anonymous student ratings — trainers cannot see this page. Ratings go straight to the admin."
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {notice}</div>}

      {/* Communication triggers */}
      <section className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Email triggers</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {TRIGGERS.map((t) => (
            <button key={t.key} onClick={() => trigger(t.key, t.fn)} disabled={!!busy} title={t.hint}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800 transition press disabled:opacity-50">
              <t.icon size={18} className="text-brand-600" />
              <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 text-center">
                {busy === t.key ? 'Sending…' : t.label}
              </span>
            </button>
          ))}
          <button onClick={() => setBroadcast({ subject: '', message: '', audience: 'active' })} disabled={!!busy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 transition press">
            <Icons.mail size={18} className="text-brand-600" />
            <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300">Broadcast</span>
          </button>
        </div>
      </section>

      {/* Trainer ratings */}
      {!data ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : data.trainers.length === 0 ? (
        <EmptyState icon={Icons.faculty} title="No trainers yet" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 stagger">
          {data.trainers.map((t, i) => (
            <article key={t.trainer_id} style={{ '--i': i }}
              className={`p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-xs ${
                t.needs_attention ? 'border-rose-300 dark:border-rose-900' : 'border-gray-100 dark:border-slate-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{t.trainer_name}</h3>
                  <p className="text-[11px] text-gray-400 truncate">{t.department}{t.specialization ? ` · ${t.specialization}` : ''}</p>
                </div>
                <ContactActions name={t.trainer_name} email={t.trainer_email}
                  message={`Dear ${t.trainer_name}, regarding your latest batch feedback.`} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Stars value={t.avg_rating} />
                {t.needs_attention === 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 text-[10px] font-bold uppercase">
                    <Icons.warning size={11} /> Needs attention
                  </span>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-4 gap-2">
                <Metric label="Clarity" value={t.avg_clarity} />
                <Metric label="Punctual" value={t.avg_punctuality} />
                <Metric label="Lab" value={t.avg_lab_support} />
                <Metric label="Doubts" value={t.avg_doubt_resolution} />
              </dl>

              <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                <span>{t.active_batches} batches · {t.students_taught} students · {t.responses} responses</span>
                <button onClick={() => openComments(t)} disabled={!t.responses}
                  className="font-bold text-brand-600 hover:underline disabled:opacity-40 disabled:no-underline">
                  Read comments
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Anonymous comments */}
      {comments && (
        <Modal isOpen size="xl" title={`Anonymous feedback — ${comments.trainer.trainer_name}`} onClose={() => setComments(null)}>
          {!comments.rows ? (
            <p className="text-xs text-gray-400 py-6 text-center">Loading…</p>
          ) : comments.rows.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No written comments.</p>
          ) : (
            <ul className="space-y-3">
              {comments.rows.map((c, i) => (
                <li key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <Stars value={c.overall} />
                    <span className="text-[10px] text-gray-400">{c.cycle} · {c.batch_name}</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-slate-300 mt-1.5">“{c.comments}”</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-gray-400 mt-4 text-center">
            Submissions are anonymous — the ERP never links a comment to a student.
          </p>
        </Modal>
      )}

      {/* Broadcast */}
      {broadcast && (
        <Modal isOpen title="Broadcast to students" onClose={() => setBroadcast(null)}
          footer={<>
            <button onClick={() => setBroadcast(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={sendBroadcast} disabled={busy === 'broadcast' || !broadcast.subject || !broadcast.message}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-brand-600 text-white disabled:opacity-50">
              {busy === 'broadcast' ? 'Sending…' : 'Send broadcast'}
            </button>
          </>}>
          <div className="space-y-4">
            <input placeholder="Subject" value={broadcast.subject} onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
              className="w-full px-3 py-2.5 min-h-11 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
            <textarea rows={5} placeholder="Message" value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
              className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100" />
            <select value={broadcast.audience} onChange={(e) => setBroadcast({ ...broadcast, audience: e.target.value })}
              className="w-full px-3 py-2.5 min-h-11 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
              <option value="active">Active students</option>
              <option value="alumni">Alumni (completed)</option>
              <option value="all">Everyone</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TrainerPerformance;

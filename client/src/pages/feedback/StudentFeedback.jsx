import React, { useEffect, useState } from 'react';
import { PageHero } from '../../components/common/PageShell';
import EmptyState from '../../components/common/EmptyState';
import { Icons } from '../../components/common/icons';
import { feedbackApi } from '../../api/adminApi';

const METRICS = [
  { key: 'clarity', label: 'Clarity of teaching' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'lab_support', label: 'Lab support' },
  { key: 'doubt_resolution', label: 'Doubt resolution' },
];

const StarPicker = ({ value, onChange, label }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          aria-label={`${label}: ${n} of 5`}
          className="p-1 press">
          <Icons.star size={22}
            className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700'} />
        </button>
      ))}
    </div>
  </div>
);

const StudentFeedback = () => {
  const [pending, setPending] = useState(null);
  const [cycle, setCycle] = useState('');
  const [active, setActive] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    feedbackApi.pending()
      .then((r) => { setPending(r.data.data.pending); setCycle(r.data.data.cycle); })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load.'));
  };
  useEffect(load, []);

  const open = (p) => {
    setActive(p);
    setRatings(Object.fromEntries(METRICS.map((m) => [m.key, 0])));
    setComments(''); setError('');
  };

  const complete = METRICS.every((m) => ratings[m.key] > 0);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await feedbackApi.submit({
        faculty_id: active.faculty_id, batch_id: active.batch_id, ...ratings, comments,
      });
      setDone('Thank you. Your anonymous feedback was recorded.');
      setActive(null); load();
      setTimeout(() => setDone(''), 5000);
    } catch (e) { setError(e.response?.data?.message || 'Unable to submit.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageHero
        tone="violet"
        icon={Icons.star}
        title="Rate your trainer"
        subtitle="Your response is anonymous. Your trainer never sees who submitted it — only the admin sees the ratings."
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {done && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {done}</div>}

      {!active && (
        pending === null ? (
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        ) : pending.length === 0 ? (
          <EmptyState icon={Icons.success} title="All done for this cycle"
            description={`You've already rated your trainers for ${cycle}.`} />
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <button key={`${p.faculty_id}-${p.batch_id}`} onClick={() => open(p)}
                className="w-full text-left p-4 rounded-xl erp-card hover-lift flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{p.trainer_name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{p.course_name} · {p.batch_name}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600">
                  Rate <Icons.star size={13} />
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {active && (
        <div className="p-5 rounded-xl erp-card animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">{active.trainer_name}</h2>
              <p className="text-[11px] text-gray-400">{active.batch_name} · cycle {cycle}</p>
            </div>
            <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-600 text-xl press">✕</button>
          </div>

          <div className="mt-3 divide-y divide-gray-50 dark:divide-slate-800">
            {METRICS.map((m) => (
              <StarPicker key={m.key} label={m.label} value={ratings[m.key] || 0}
                onChange={(n) => setRatings({ ...ratings, [m.key]: n })} />
            ))}
          </div>

          <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
            placeholder="Anything else? (optional, anonymous)"
            className="mt-3 w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none" />

          <button onClick={submit} disabled={busy || !complete}
            className="mt-3 w-full py-2.5 min-h-11 rounded-lg bg-brand-600 text-white text-xs font-bold disabled:opacity-50 press">
            {busy ? 'Submitting…' : complete ? 'Submit anonymously' : 'Rate all four areas'}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2">One response per trainer per cycle.</p>
        </div>
      )}
    </div>
  );
};

export default StudentFeedback;

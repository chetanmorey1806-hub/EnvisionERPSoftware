import React, { useEffect, useRef, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { portfolioApi } from '../../api/portfolioApi';
import { trainerEvalApi } from '../../api/trainerEvalApi';
import { useT } from '../../context/LanguageContext';

/**
 * My Portfolio — the student's side of the placement bargain.
 *
 * The honest bit: this page shows the student EXACTLY what a recruiter sees,
 * including why they are not in the placement pool. No student should be
 * surprised to learn they were never put forward.
 */
const PortfolioPage = () => {
  const { t } = useT();
  const fileRef = useRef(null);

  const [data, setData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState({ github_url: '', portfolio_url: '', linkedin_url: '', summary: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 5000); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  const load = async () => {
    try {
      const [p, s] = await Promise.all([
        portfolioApi.get(),
        trainerEvalApi.getSkills().catch(() => ({ data: { data: [] } })),
      ]);
      setData(p.data.data);
      setSkills(s.data.data || []);
      const pr = p.data.data.profile || {};
      setForm({
        github_url: pr.github_url || '',
        portfolio_url: pr.portfolio_url || '',
        linkedin_url: pr.linkedin_url || '',
        summary: pr.summary || '',
      });
    } catch (e) { fail(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      await portfolioApi.update(form);
      flash(t('Portfolio saved.'));
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const r = await portfolioApi.uploadResume(file);
      // Tell them plainly whether it is searchable — a scanned PDF is not.
      flash(r.data.data.note);
      load();
    } catch (e2) { fail(e2); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const claim = async (skillId) => {
    try {
      await portfolioApi.addSkill({ skill_id: skillId, level: 'beginner' });
      flash(t('Skill added. A trainer must verify it before recruiters see it.'));
      load();
    } catch (e) { fail(e); }
  };

  if (loading) return <p className="text-xs text-gray-500 py-10 text-center">{t('Loading…')}</p>;
  if (!data) return <p className="text-xs text-rose-600 py-10 text-center">{err || t('Something went wrong.')}</p>;

  const mine = new Set((data.skills || []).map((s) => s.skill_id));
  const ready = data.readiness;

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: t('Placements') }, { label: t('My Portfolio') }]} />

      <div>
        <h1 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-8 h-8 grid place-items-center rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600">
            <Icons.briefcase size={18} />
          </span>
          {t('My Portfolio')}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('What recruiters see when the placement team searches for candidates.')}
        </p>
      </div>

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      {/* Readiness — the honest mirror */}
      <div className={`p-4 rounded-xl border ${
        ready.job_ready
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
      }`}>
        <p className={`text-xs font-extrabold uppercase ${ready.job_ready ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ready.job_ready ? `✓ ${t('You are Job-Ready')}` : t('Not in the placement pool yet')}
        </p>
        <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 mb-2">
          {ready.job_ready
            ? t('You can be put forward for openings that match your skills.')
            : t('All three have to be true before the placement team can put you forward:')}
        </p>
        <div className="space-y-1">
          {ready.checks.map((c) => (
            <div key={c.key} className="flex items-start gap-2 text-[11px]">
              <span className={c.passed ? 'text-emerald-600' : 'text-rose-600'}>{c.passed ? '✓' : '✗'}</span>
              <div>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{t(c.label)}</span>
                <span className="text-gray-500"> — {c.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Resume + links */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
          <p className="text-xs font-bold uppercase text-gray-500">{t('Resume & links')}</p>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-950/40 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                {data.profile?.resume_name || t('No resume uploaded')}
              </p>
              <p className="text-[11px] text-gray-500">
                {data.profile?.resume_name
                  ? (data.has_resume_text
                    ? t('Indexed — recruiters can find you by keyword.')
                    : t('Not searchable — no text could be read from it. A text-based PDF works best.'))
                  : t('A text-based PDF works best.')}
              </p>
            </div>
            <label className="shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 text-white cursor-pointer">
              {busy ? t('Uploading…') : t('Upload')}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={upload} disabled={busy} />
            </label>
          </div>

          <Field label="GitHub">
            <input className={inputClsCompact} value={form.github_url}
              onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              placeholder="github.com/yourname" />
          </Field>
          <Field label="Live projects / portfolio">
            <input className={inputClsCompact} value={form.portfolio_url}
              onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} />
          </Field>
          <Field label="LinkedIn">
            <input className={inputClsCompact} value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
          </Field>
          <Field label="About you" hint="Two lines a recruiter will actually read.">
            <textarea rows={2} className={inputClsCompact} value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </Field>

          <button onClick={save} disabled={busy}
            className="w-full px-4 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 text-white disabled:opacity-50">
            {busy ? t('Saving…') : t('Save portfolio')}
          </button>
        </div>

        {/* Skills */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
          <p className="text-xs font-bold uppercase text-gray-500">{t('Skills')}</p>
          <p className="text-[11px] text-gray-500">
            {t('A skill you add yourself is a claim. Only a trainer-verified skill is shown to recruiters — that is what makes it worth something.')}
          </p>

          {(data.skills || []).length > 0 && (
            <div className="space-y-1.5">
              {data.skills.map((s) => (
                <div key={s.skill_id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-[11px] text-gray-500"> · {t(s.level)}</span>
                  </div>
                  {s.source === 'trainer' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700">
                      ✓ {t('verified')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-500">
                      {t('unverified')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1.5">{t('Add a skill you have')}</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.filter((s) => !mine.has(s.id)).map((s) => (
                <button key={s.id} onClick={() => claim(s.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300">
                  + {s.name}
                </button>
              ))}
              {skills.filter((s) => !mine.has(s.id)).length === 0 && (
                <p className="text-[11px] text-gray-500">{t('Nothing left to add.')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;

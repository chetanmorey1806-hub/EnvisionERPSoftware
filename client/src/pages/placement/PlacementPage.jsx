import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import { PageHero } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { placementApi } from '../../api/placementApi';
import { trainerEvalApi } from '../../api/trainerEvalApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * Placements — the institute as an internal recruitment agency.
 *
 *   Jobs       · the JD, and the bar it sets
 *   Candidates · who is genuinely eligible (hard filter, then ranked)
 *   Pipeline   · the rounds, and logging what happened
 *   Skill gaps · what the market keeps rejecting us for
 *
 * The idea this screen is built around: ELIGIBLE and GOOD are different
 * questions. A candidate missing a mandatory skill is not "a low score" — they
 * are not a candidate, and the UI never lets you shortlist one by accident.
 */

const NEXT = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['internal_screening_passed', 'rejected'],
  internal_screening_passed: ['client_round_1', 'rejected'],
  client_round_1: ['client_round_2', 'offered', 'rejected'],
  client_round_2: ['offered', 'rejected'],
  offered: ['placed', 'rejected'],
  placed: [],
  rejected: [],
  withdrawn: [],
};
const ROUNDS = ['internal_screening', 'client_round_1', 'client_round_2', 'technical', 'hr', 'final'];

const TONE = {
  job_ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  placed: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400',
  offered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  remedial_required: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  in_training: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  unskilled: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500',
  blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
};

const Tag = ({ s }) => {
  const { t } = useT();
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${TONE[s] || TONE.in_training}`}>
      {t(String(s || '').replace(/_/g, ' '))}
    </span>
  );
};

const Stat = ({ label, value, tone = 'gray' }) => {
  const { t } = useT();
  const tones = {
    gray: 'text-gray-900 dark:text-slate-100', emerald: 'text-emerald-600',
    amber: 'text-amber-600', blue: 'text-brand-600',
  };
  return (
    <div className="p-3 rounded-xl erp-card">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{t(label)}</p>
      <p className={`text-lg font-extrabold mt-0.5 ${tones[tone]}`}>{value}</p>
    </div>
  );
};

const PlacementPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [stats, setStats] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [jobForm, setJobForm] = useState(null);
  const [match, setMatch] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [interview, setInterview] = useState(null);

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 4500); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [j, s, m, g] = await Promise.all([
        placementApi.getJobs(),
        trainerEvalApi.getSkills().catch(() => ({ data: { data: [] } })),
        placementApi.getStats(),
        placementApi.getSkillGaps().catch(() => ({ data: { data: [] } })),
      ]);
      setJobs(j.data.data || []);
      setSkills(s.data.data || []);
      setStats(m.data.data || null);
      setGaps(g.data.data || []);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openMatch = async (job) => {
    setBusy(true);
    setErr('');
    try {
      const r = await placementApi.matchCandidates(job.id);
      setMatch(r.data.data);
      setTab('match');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const openPipeline = async (job) => {
    setBusy(true);
    try {
      const r = await placementApi.getPipeline(job.id);
      setPipeline({ job, rows: r.data.data || [] });
      setTab('pipeline');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doShortlist = async (c, force = false) => {
    let reason = null;
    if (force) {
      reason = window.prompt(t('This candidate does not meet the bar. Why are you putting them forward anyway?'));
      if (!reason?.trim()) return;
    }
    try {
      await placementApi.shortlist({
        job_id: match.job.id, student_id: c.student_id, match_score: c.match_score,
        force, reason: reason?.trim(),
      });
      flash(`${c.name} — ${t('shortlisted')}.`);
      openMatch(match.job);
    } catch (e) { fail(e); }
  };

  const doAdvance = async (row, status) => {
    let reason = null;
    if (status === 'rejected') {
      reason = window.prompt(t('Why were they rejected? The trainer learns from this.'));
      if (!reason?.trim()) return;
    }
    try {
      await placementApi.advance(row.id, status, reason?.trim());
      flash(t('Application moved.'));
      openPipeline(pipeline.job);
      load();
    } catch (e) { fail(e); }
  };

  const saveJob = async () => {
    setBusy(true);
    setErr('');
    try {
      const payload = { ...jobForm, skills: jobForm.skills || [] };
      if (jobForm.id) await placementApi.updateJob(jobForm.id, payload);
      else await placementApi.postJob(payload);
      flash(t('Job saved.'));
      setJobForm(null);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const saveInterview = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await placementApi.logInterview(interview.application_id, {
        round: interview.round,
        result: interview.result,
        interviewer: interview.interviewer || null,
        feedback: interview.feedback || null,
        deficiencies: (interview.deficiencies || []).map((id) => ({ skill_id: id })),
      });
      flash(r.data.message);
      setInterview(null);
      openPipeline(pipeline.job);
      load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const toggleJobSkill = (id) => {
    const list = jobForm.skills || [];
    const found = list.find((s) => s.skill_id === id);
    setJobForm({
      ...jobForm,
      skills: found
        ? list.filter((s) => s.skill_id !== id)
        : [...list, { skill_id: id, is_mandatory: true, min_level: 'beginner' }],
    });
  };

  const toggleDeficiency = (id) => {
    const list = interview.deficiencies || [];
    setInterview({
      ...interview,
      deficiencies: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    });
  };

  const TABS = useMemo(() => ([
    { key: 'jobs', label: 'Jobs' },
    ...(match ? [{ key: 'match', label: 'Candidates' }] : []),
    ...(pipeline ? [{ key: 'pipeline', label: 'Pipeline' }] : []),
    { key: 'gaps', label: 'Skill gaps' },
  ]), [match, pipeline]);

  return (
    <div className="space-y-4">
      <PageHero
        tone="cyan"
        icon={Icons.placements}
        title="Placements"
        subtitle="Match Job-Ready students to openings, run the rounds, and send what goes wrong back to the trainer."
        action={can('placements.create') && (
          <button
            onClick={() => setJobForm({
              company: '', role: '', package: '', location: '', jd: '', hr_name: '', hr_email: '',
              openings: 1, min_attendance_pct: 85, min_score_pct: 75, require_job_ready: 1, skills: [],
            })}
            className="erp-hero-btn px-4 py-2.5 min-h-11">
            <Icons.plus size={15} aria-hidden="true" /> {t('Post a job')}
          </button>
        )}
      />

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Job-Ready" value={stats.jobReady} tone="emerald" />
          <Stat label="Needs remedial" value={stats.remedialRequired} tone="amber" />
          <Stat label="Open jobs" value={stats.openJobs} />
          <Stat label="In pipeline" value={stats.inPipeline} tone="blue" />
          <Stat label="Placed" value={stats.placed} tone="blue" />
        </div>
      )}

      <div className="erp-tabs">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={`erp-tab ${tab === x.key ? 'erp-tab-active' : ''}`}>
            {t(x.label)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-gray-500 py-8 text-center">{t('Loading…')}</p>}

      {/* ---------------- JOBS ---------------- */}
      {!loading && tab === 'jobs' && (
        jobs.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
            <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('No openings yet')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('Post a job description and the system will work out who is eligible.')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((j) => (
              <div key={j.id} className="p-4 rounded-xl erp-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{j.role}</p>
                    <p className="text-[11px] text-gray-500">{j.company} · {j.location || '—'}</p>
                  </div>
                  <Tag s={j.status === 'open' ? 'job_ready' : 'rejected'} />
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                  {j.package && <p className="font-semibold text-emerald-600">{j.package}</p>}
                  {j.skills && <p>{t('Skills')}: {j.skills}</p>}
                  <p>
                    {t('Bar')}: {t('attendance')} {j.min_attendance_pct}% · {t('score')} {j.min_score_pct}%
                    {Number(j.require_job_ready) === 1 && ` · ${t('Job-Ready only')}`}
                  </p>
                  <p className="text-gray-400">
                    {j.openings} {t('opening(s)')} · {j.applicants} {t('in pipeline')} · {j.placed} {t('placed')}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {can('placements.match') && (
                    <button onClick={() => openMatch(j)} disabled={busy}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-brand-600 text-white disabled:opacity-50">
                      {t('Find candidates')}
                    </button>
                  )}
                  <button onClick={() => openPipeline(j)}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200">
                    {t('Pipeline')} ({j.applicants})
                  </button>
                  {can('placements.update') && (
                    <button onClick={() => setJobForm({ ...j, skills: [] })}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-brand-600">{t('Edit')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ---------------- CANDIDATES ---------------- */}
      {!loading && tab === 'match' && match && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800">
            <p className="text-xs font-bold text-gray-800 dark:text-slate-100">
              {match.job.role} — {match.job.company}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {t('Must have')}: {match.requirements.mandatory.map((m) => `${m.name} (${m.min_level}+)`).join(', ') || '—'}
              {' · '}{t('attendance')} ≥ {match.requirements.min_attendance_pct}%
              {' · '}{t('score')} ≥ {match.requirements.min_score_pct}%
              {match.requirements.require_job_ready ? ` · ${t('Job-Ready only')}` : ''}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              <b>{match.summary.eligible}</b> {t('eligible')} · <b>{match.summary.near_misses_total}</b> {t('near misses')} · {match.summary.considered} {t('considered')}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase text-emerald-600 mb-2">
              {t('Eligible — meets every requirement')}
            </p>
            {match.candidates.length === 0 ? (
              <p className="text-xs text-gray-500 p-4 rounded-lg border border-dashed border-gray-200 dark:border-slate-800">
                {t('Nobody currently meets this bar. Relax a requirement, or wait for trainers to sign students off.')}
              </p>
            ) : (
              <div className="space-y-2">
                {match.candidates.map((c) => (
                  <div key={c.student_id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                          {c.name} <Tag s={c.employability} />
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {t('attendance')} {c.attendance_pct}% · {t('technical')} {c.technical_pct}% · {t('soft skills')} {c.soft_skill_avg}/5
                        </p>
                        <p className="text-[11px] text-gray-500">{t('Skills')}: {c.matched_skills.join(', ') || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold text-emerald-600">{c.match_score}</span>
                        {can('placements.match') && (
                          <button onClick={() => doShortlist(c)}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white">
                            {t('Shortlist')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {match.near_misses.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase text-amber-600 mb-1">
                {t('Near misses — blocked, and why')}
              </p>
              <p className="text-[11px] text-gray-500 mb-2">
                {t('These do not meet the bar. Putting one forward is an override and has to be justified.')}
              </p>
              <div className="space-y-2">
                {match.near_misses.map((c) => (
                  <div key={c.student_id}
                    className="p-3 rounded-xl erp-card">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-gray-800 dark:text-slate-200 flex items-center gap-2">
                          {c.name} <Tag s={c.employability} />
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {c.blockers.map((b) => (
                            <li key={b} className="text-[11px] text-rose-600">· {b}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400">{c.match_score}</span>
                        {can('placements.match') && (
                          <button onClick={() => doShortlist(c, true)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-amber-400 text-amber-700">
                            {t('Override')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- PIPELINE ---------------- */}
      {!loading && tab === 'pipeline' && pipeline && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-800 dark:text-slate-100">
            {pipeline.job.role} — {pipeline.job.company}
          </p>
          {pipeline.rows.length === 0 ? (
            <p className="text-xs text-gray-500 p-6 rounded-lg border border-dashed border-gray-200 dark:border-slate-800 text-center">
              {t('Nobody in this pipeline yet — find candidates and shortlist them.')}
            </p>
          ) : (
            <div className="space-y-2">
              {pipeline.rows.map((r) => (
                <div key={r.id} className="p-3 rounded-xl erp-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        {r.student_name} <Tag s={r.status} />
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {r.admission_no || '—'} · {r.rounds} {t('round(s) logged')}
                        {r.match_score ? ` · ${t('match')} ${r.match_score}` : ''}
                      </p>
                      {r.rejection_reason && (
                        <p className="text-[11px] text-rose-600 mt-0.5">{r.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {can('placements.interview') && !['placed', 'rejected', 'withdrawn'].includes(r.status) && (
                        <button
                          onClick={() => setInterview({
                            application_id: r.id, student: r.student_name,
                            round: 'client_round_1', result: 'passed',
                            interviewer: '', feedback: '', deficiencies: [],
                          })}
                          className="erp-btn-primary px-2.5 py-1.5 text-[11px]">
                          {t('Log interview')}
                        </button>
                      )}
                      {can('placements.update') && (NEXT[r.status] || []).map((s) => (
                        <button key={s} onClick={() => doAdvance(r, s)}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg ${
                            s === 'rejected'
                              ? 'border border-rose-300 text-rose-600'
                              : 'bg-brand-600 text-white'
                          }`}>
                          {t(s.replace(/_/g, ' '))}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- SKILL GAPS ---------------- */}
      {!loading && tab === 'gaps' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {t('Every skill a company has rejected our students for. The same gap across many students is a curriculum problem, not a student problem.')}
          </p>
          {gaps.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('No skill gaps recorded')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('These appear when a rejection is tagged with a skill.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id}
                  className="p-3 rounded-xl erp-card flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{g.skill}</p>
                    <p className="text-[11px] text-gray-500">{t('cited by')}: {g.cited_by}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-amber-600">{g.students_affected}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{t('students')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- job modal ---------------- */}
      {jobForm && (
        <Modal isOpen size="lg" title={jobForm.id ? t('Edit job') : t('Post a job')} onClose={() => setJobForm(null)}
          footer={<>
            <button onClick={() => setJobForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={saveJob} disabled={busy || !jobForm.company || !jobForm.role}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-brand-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Save job')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" required>
              <input className={inputClsCompact} value={jobForm.company}
                onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })} />
            </Field>
            <Field label="Role" required>
              <input className={inputClsCompact} value={jobForm.role}
                onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })} />
            </Field>
            <Field label="Package">
              <input className={inputClsCompact} value={jobForm.package || ''}
                onChange={(e) => setJobForm({ ...jobForm, package: e.target.value })} placeholder="4.5 LPA" />
            </Field>
            <Field label="Location">
              <input className={inputClsCompact} value={jobForm.location || ''}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} />
            </Field>
            <Field label="HR contact">
              <input className={inputClsCompact} value={jobForm.hr_name || ''}
                onChange={(e) => setJobForm({ ...jobForm, hr_name: e.target.value })} />
            </Field>
            <Field label="HR email">
              <input className={inputClsCompact} value={jobForm.hr_email || ''}
                onChange={(e) => setJobForm({ ...jobForm, hr_email: e.target.value })} />
            </Field>
            <Field label="Job description" className="col-span-2">
              <textarea rows={2} className={inputClsCompact} value={jobForm.jd || ''}
                onChange={(e) => setJobForm({ ...jobForm, jd: e.target.value })} />
            </Field>

            <Field label="Required skills" className="col-span-2"
              hint="A HARD filter — a candidate without these is not eligible, however good they are.">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => {
                  const on = (jobForm.skills || []).some((x) => x.skill_id === s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleJobSkill(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        on
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                      }`}>
                      {s.name}
                    </button>
                  );
                })}
                {skills.length === 0 && (
                  <p className="text-[11px] text-gray-500">{t('No skills defined yet — trainers create them when they evaluate.')}</p>
                )}
              </div>
            </Field>

            <Field label="Min attendance %">
              <input type="number" className={inputClsCompact} value={jobForm.min_attendance_pct}
                onChange={(e) => setJobForm({ ...jobForm, min_attendance_pct: e.target.value })} />
            </Field>
            <Field label="Min technical score %">
              <input type="number" className={inputClsCompact} value={jobForm.min_score_pct}
                onChange={(e) => setJobForm({ ...jobForm, min_score_pct: e.target.value })} />
            </Field>
            <Field label="Openings">
              <input type="number" className={inputClsCompact} value={jobForm.openings}
                onChange={(e) => setJobForm({ ...jobForm, openings: e.target.value })} />
            </Field>
            <Field label="Job-Ready only" hint="Only students a trainer has signed off.">
              <select className={inputClsCompact} value={jobForm.require_job_ready}
                onChange={(e) => setJobForm({ ...jobForm, require_job_ready: Number(e.target.value) })}>
                <option value={1}>{t('Yes')}</option>
                <option value={0}>{t('No')}</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {/* ---------------- interview modal — where the loop closes ---------------- */}
      {interview && (
        <Modal isOpen size="md" title={`${t('Log interview')} — ${interview.student}`} onClose={() => setInterview(null)}
          footer={<>
            <button onClick={() => setInterview(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={saveInterview}
              disabled={busy || (interview.result === 'failed' && !interview.feedback?.trim())}
              className="erp-btn-primary px-4 py-2.5 text-xs">
              {busy ? t('Saving…') : t('Save interview')}
            </button>
          </>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Round" required>
                <select className={inputClsCompact} value={interview.round}
                  onChange={(e) => setInterview({ ...interview, round: e.target.value })}>
                  {ROUNDS.map((r) => <option key={r} value={r}>{t(r.replace(/_/g, ' '))}</option>)}
                </select>
              </Field>
              <Field label="Result" required>
                <select className={inputClsCompact} value={interview.result}
                  onChange={(e) => setInterview({ ...interview, result: e.target.value })}>
                  {['passed', 'failed', 'pending', 'no_show'].map((r) => (
                    <option key={r} value={r}>{t(r.replace(/_/g, ' '))}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Interviewer">
              <input className={inputClsCompact} value={interview.interviewer}
                onChange={(e) => setInterview({ ...interview, interviewer: e.target.value })} />
            </Field>
            <Field label="Feedback" required={interview.result === 'failed'}
              hint="On a failed round this is what the trainer reads. Be specific.">
              <textarea rows={3} className={inputClsCompact} value={interview.feedback}
                onChange={(e) => setInterview({ ...interview, feedback: e.target.value })}
                placeholder={t('e.g. Good React, but could not write a JOIN across three tables.')} />
            </Field>

            {interview.result === 'failed' && (
              <Field label="Which skills let them down?"
                hint="Each skill you tag raises a remedial task on that student’s trainer. This is how teaching improves.">
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => {
                    const on = (interview.deficiencies || []).includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleDeficiency(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          on
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                        }`}>
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {interview.result === 'failed' && (interview.deficiencies || []).length > 0 && (
              <p className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[11px] font-semibold text-amber-700">
                {(interview.deficiencies || []).length}{' '}
                {t('remedial task(s) will be raised on the trainer’s dashboard, and this student leaves the Job-Ready pool.')}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlacementPage;

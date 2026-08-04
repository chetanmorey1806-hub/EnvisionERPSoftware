import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/common/Modal';
import Breadcrumb from '../../components/common/Breadcrumb';
import { Icons } from '../../components/common/icons';
import { Field, inputClsCompact } from '../../components/form/FormKit';
import { trainerEvalApi } from '../../api/trainerEvalApi';
import { batchApi } from '../../api/batchApi';
import { facultyPortalApi } from '../../api/facultyPortalApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * Student Readiness — the trainer's half of the placement loop.
 *
 *   Readiness · the three Job-Ready conditions, per student, with evidence
 *   Remedials · what interview rejections sent back to me
 *
 * The trainer cannot mark anyone Job-Ready. They can record a score and sign
 * off soft skills; the status is derived. That is deliberate — it makes the
 * Job-Ready tag mean something to a recruiter.
 */

const TONE = {
  job_ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  remedial_required: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  in_training: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  unskilled: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500',
  blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  open: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500',
};

const Tag = ({ s }) => {
  const { t } = useT();
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${TONE[s] || TONE.in_training}`}>
      {t(String(s || '').replace(/_/g, ' '))}
    </span>
  );
};

/** A tiny bar so a number becomes a judgement at a glance. */
const Meter = ({ value, bar }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
      <div className={`h-full ${value >= bar ? 'bg-emerald-500' : 'bg-rose-400'}`}
        style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className={`text-[11px] font-bold ${value >= bar ? 'text-emerald-600' : 'text-rose-600'}`}>
      {value}%
    </span>
  </div>
);

const ASSESSMENT_TYPES = ['mock_test', 'code_review', 'lab_exam', 'mock_interview', 'project'];

const ReadinessPage = () => {
  const { can } = usePermissions();
  const { t } = useT();

  const [tab, setTab] = useState('readiness');
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [evalForm, setEvalForm] = useState(null);
  const [skillName, setSkillName] = useState('');

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 4500); };
  const fail = (e) => setErr(e?.response?.data?.message || e.message || t('Something went wrong.'));

  useEffect(() => {
    (async () => {
      try {
        // A trainer may only open a batch they teach — the server enforces that,
        // so offer them exactly those. Falling back to every batch would hand a
        // supervisor the full list while showing a trainer a menu of 403s.
        let list = [];
        try {
          const mine = await facultyPortalApi.batches();
          list = mine.data.data?.items || mine.data.data || [];
        } catch {
          list = [];
        }
        if (!list.length) {
          const all = await batchApi.getAll().catch(() => ({ data: { data: [] } }));
          list = all.data.data?.items || all.data.data || [];
        }

        const [s, r] = await Promise.all([
          trainerEvalApi.getSkills().catch(() => ({ data: { data: [] } })),
          trainerEvalApi.getRemedialTasks().catch(() => ({ data: { data: { tasks: [] } } })),
        ]);
        setBatches(list);
        setSkills(s.data.data || []);
        setTasks(r.data.data?.tasks || []);
        if (list[0]) setBatchId(String(list[0].id));
      } catch (e) { fail(e); } finally { setLoading(false); }
    })();
  }, []);

  const loadBatch = async (id) => {
    if (!id) return;
    setBusy(true);
    setErr('');
    try {
      const r = await trainerEvalApi.batchReadiness(id);
      setRows(r.data.data.students || []);
      setSummary(r.data.data.summary || null);
    } catch (e) { fail(e); setRows([]); setSummary(null); } finally { setBusy(false); }
  };
  useEffect(() => { if (batchId) loadBatch(batchId); /* eslint-disable-next-line */ }, [batchId]);

  const reloadTasks = async () => {
    const r = await trainerEvalApi.getRemedialTasks();
    setTasks(r.data.data?.tasks || []);
  };

  const saveEval = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await trainerEvalApi.evaluateStudent({
        student_id: evalForm.student_id,
        batch_id: Number(batchId),
        type: evalForm.type,
        title: evalForm.title,
        max_marks: Number(evalForm.max_marks),
        marks_obtained: Number(evalForm.marks_obtained),
        weight: Number(evalForm.weight || 1),
        skill_id: evalForm.skill_id || null,
        remarks: evalForm.remarks || null,
        verify_skill: evalForm.verify && evalForm.skill_id
          ? { skill_id: evalForm.skill_id, level: evalForm.level || 'intermediate' }
          : undefined,
      });
      flash(r.data.message);
      setEvalForm(null);
      loadBatch(batchId);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const toggleClearance = async (row) => {
    if (!row.soft_skill_cleared) {
      const ok = window.confirm(
        t('Sign off this student’s soft skills? If their attendance and scores also meet the bar, they become Job-Ready immediately and enter the placement pool.')
      );
      if (!ok) return;
    }
    try {
      const r = await trainerEvalApi.setSoftSkillClearance(row.student_id, {
        cleared: !row.soft_skill_cleared,
        batch_id: Number(batchId),
      });
      flash(r.data.message);
      loadBatch(batchId);
    } catch (e) { fail(e); }
  };

  const setTaskStatus = async (task, status) => {
    try {
      const r = await trainerEvalApi.updateRemedialTask(task.id, status);
      const emp = r.data.data.employability;
      flash(emp?.changed
        ? `${t('Task closed')} — ${task.student_name} ${t('is now')} ${t(String(emp.status).replace(/_/g, ' '))}.`
        : r.data.message);
      reloadTasks();
      if (batchId) loadBatch(batchId);
    } catch (e) { fail(e); }
  };

  const addSkill = async () => {
    if (!skillName.trim()) return;
    try {
      const r = await trainerEvalApi.createSkill({ name: skillName.trim() });
      setSkills((s) => (s.some((x) => x.id === r.data.data.id) ? s : [...s, r.data.data]));
      setSkillName('');
      flash(t('Skill added.'));
    } catch (e) { fail(e); }
  };

  const openTasks = useMemo(() => tasks.filter((x) => x.status === 'open').length, [tasks]);

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: t('Academics') }, { label: t('Student Readiness') }]} />

      <div>
        <h1 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-8 h-8 grid place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
            <Icons.results size={18} />
          </span>
          {t('Student Readiness')}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('Benchmark skills and sign off soft skills. Job-Ready is then derived — you cannot set it by hand.')}
        </p>
      </div>

      {err && <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">{err}</div>}
      {note && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">{note}</div>}

      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-800">
        {[
          { key: 'readiness', label: 'Readiness' },
          { key: 'remedials', label: `Remedial tasks${openTasks ? ` (${openTasks})` : ''}` },
        ].map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px ${
              tab === x.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'
            }`}>
            {x.key === 'remedials' && openTasks > 0 && <span className="mr-1">🔴</span>}
            {t(x.label.replace(/\s\(\d+\)$/, ''))}{x.key === 'remedials' && openTasks ? ` (${openTasks})` : ''}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-gray-500 py-8 text-center">{t('Loading…')}</p>}

      {/* ---------------- READINESS ---------------- */}
      {!loading && tab === 'readiness' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inputClsCompact} max-w-xs`} value={batchId}
              onChange={(e) => setBatchId(e.target.value)}>
              <option value="">{t('Select a batch')}</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
            {summary && (
              <div className="flex gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 font-bold">
                  {summary.job_ready} {t('job ready')}
                </span>
                <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 font-bold">
                  {summary.remedial} {t('remedial')}
                </span>
                <span className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 font-bold">
                  {summary.placed} {t('placed')}
                </span>
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-gray-500 p-6 rounded-lg border border-dashed border-gray-200 dark:border-slate-800 text-center">
              {t('No students in this batch.')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
                  <tr>
                    {['Student', 'Attendance', 'Technical', 'Soft skills', 'Status', ''].map((h) => (
                      <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.student_id} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2">
                        <p className="font-bold text-gray-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {r.admission_no || '—'} · {r.assessments} {t('assessment(s)')}
                        </p>
                      </td>
                      <td className="px-3 py-2"><Meter value={r.attendance_pct} bar={85} /></td>
                      <td className="px-3 py-2"><Meter value={r.technical_pct} bar={75} /></td>
                      <td className="px-3 py-2">
                        {can('employability.clear') ? (
                          <button onClick={() => toggleClearance(r)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                              r.soft_skill_cleared
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                            }`}>
                            {r.soft_skill_cleared ? `✓ ${t('signed off')}` : t('sign off')}
                          </button>
                        ) : (
                          <span className="text-[11px]">{r.soft_skill_cleared ? '✓' : '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2"><Tag s={r.employability} /></td>
                      <td className="px-3 py-2 text-right">
                        {can('employability.evaluate') && (
                          <button
                            onClick={() => setEvalForm({
                              student_id: r.student_id, name: r.name, type: 'mock_test', title: '',
                              max_marks: 100, marks_obtained: '', weight: 1, skill_id: '', verify: true,
                              level: 'intermediate', remarks: '',
                            })}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white">
                            {t('Evaluate')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- REMEDIALS ---------------- */}
      {!loading && tab === 'remedials' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {t('What the market sent back. Each task came from a real interview rejection — closing it re-checks the student’s readiness.')}
          </p>
          {tasks.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t('Nothing to remediate')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('When a company rejects one of your students for a skill gap, it lands here.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id}
                  className={`p-3 rounded-xl bg-white dark:bg-slate-900 border ${
                    task.status === 'open'
                      ? 'border-rose-200 dark:border-rose-900/50'
                      : 'border-gray-100 dark:border-slate-800'
                  }`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-55">
                      <p className="font-bold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        {task.title} <Tag s={task.status} />
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {task.student_name} · {task.batch_name || '—'}
                        {task.due_date && ` · ${t('due')} ${String(task.due_date).slice(0, 10)}`}
                        {task.source === 'interview_feedback' && ` · ${t('from an interview rejection')}`}
                      </p>
                      {task.detail && (
                        <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-1 p-2 rounded-lg bg-gray-50 dark:bg-slate-950/40">
                          {task.detail}
                        </p>
                      )}
                    </div>
                    {can('remedials.update') && task.status !== 'done' && (
                      <div className="flex gap-1.5">
                        {task.status === 'open' && (
                          <button onClick={() => setTaskStatus(task, 'in_progress')}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700">
                            {t('Start')}
                          </button>
                        )}
                        <button onClick={() => setTaskStatus(task, 'done')}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white">
                          {t('Mark done')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- evaluate modal ---------------- */}
      {evalForm && (
        <Modal isOpen size="md" title={`${t('Evaluate')} — ${evalForm.name}`} onClose={() => setEvalForm(null)}
          footer={<>
            <button onClick={() => setEvalForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">{t('Cancel')}</button>
            <button onClick={saveEval}
              disabled={busy || !evalForm.title.trim() || evalForm.marks_obtained === ''}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white disabled:opacity-50">
              {busy ? t('Saving…') : t('Save evaluation')}
            </button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" required>
              <select className={inputClsCompact} value={evalForm.type}
                onChange={(e) => setEvalForm({ ...evalForm, type: e.target.value })}>
                {ASSESSMENT_TYPES.map((x) => <option key={x} value={x}>{t(x.replace(/_/g, ' '))}</option>)}
              </select>
            </Field>
            <Field label="Title" required>
              <input className={inputClsCompact} value={evalForm.title}
                onChange={(e) => setEvalForm({ ...evalForm, title: e.target.value })}
                placeholder={t('e.g. Week 6 React test')} />
            </Field>
            <Field label="Marks obtained" required>
              <input type="number" className={inputClsCompact} value={evalForm.marks_obtained}
                onChange={(e) => setEvalForm({ ...evalForm, marks_obtained: e.target.value })} />
            </Field>
            <Field label="Out of">
              <input type="number" className={inputClsCompact} value={evalForm.max_marks}
                onChange={(e) => setEvalForm({ ...evalForm, max_marks: e.target.value })} />
            </Field>
            <Field label="Weight" className="col-span-2"
              hint="A final lab exam should count for more than a pop quiz. The technical score is a weighted mean.">
              <input type="number" min="1" className={inputClsCompact} value={evalForm.weight}
                onChange={(e) => setEvalForm({ ...evalForm, weight: e.target.value })} />
            </Field>

            <Field label="Skill" className="col-span-2"
              hint="Verifying a skill is what makes it visible to recruiters — a student's own claim is not enough.">
              <select className={inputClsCompact} value={evalForm.skill_id}
                onChange={(e) => setEvalForm({ ...evalForm, skill_id: Number(e.target.value) || '' })}>
                <option value="">{t('None')}</option>
                {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>

            {evalForm.skill_id && (
              <>
                <Field label="Level">
                  <select className={inputClsCompact} value={evalForm.level}
                    onChange={(e) => setEvalForm({ ...evalForm, level: e.target.value })}>
                    {['beginner', 'intermediate', 'advanced'].map((l) => (
                      <option key={l} value={l}>{t(l)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Verify this skill?">
                  <select className={inputClsCompact} value={evalForm.verify ? '1' : '0'}
                    onChange={(e) => setEvalForm({ ...evalForm, verify: e.target.value === '1' })}>
                    <option value="1">{t('Yes — I have seen them do it')}</option>
                    <option value="0">{t('No')}</option>
                  </select>
                </Field>
              </>
            )}

            <div className="col-span-2 flex items-end gap-2">
              <Field label="New skill" className="flex-1"
                hint="Not in the list? Add it — it becomes available to every trainer and JD.">
                <input className={inputClsCompact} value={skillName}
                  onChange={(e) => setSkillName(e.target.value)} placeholder={t('e.g. Docker')} />
              </Field>
              <button type="button" onClick={addSkill}
                className="mb-1 px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 dark:bg-slate-800">
                {t('Add')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReadinessPage;

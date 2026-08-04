import React, { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import SearchFilter from '../../components/common/SearchFilter';
import { Icons } from '../../components/common/icons';
import { classroomApi } from '../../api/classroomApi';
import { batchApi } from '../../api/batchApi';
import { usePermissions } from '../../hooks/usePermissions';
import ContactActions from '../../components/common/ContactActions';
import ShareByEmail from '../../components/common/ShareByEmail';

const KINDS = [
  { value: 'classwork', label: 'Classwork', icon: Icons.courses, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  { value: 'homework', label: 'Homework', icon: Icons.admissions, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  { value: 'lab', label: 'Lab', icon: Icons.exams, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  { value: 'material', label: 'Material', icon: Icons.library, tone: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300' },
];
const kindOf = (v) => KINDS.find((k) => k.value === v) || KINDS[3];

const EMPTY = { batch_id: '', title: '', type: 'classwork', instructions: '', duration_minutes: '', due_date: '', file: null };

const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    <div className="mt-1">{children}</div>
  </label>
);

const isOverdue = (d) => d && new Date(`${d}T23:59:59`) < new Date();

const ClassroomPage = () => {
  const { can } = usePermissions();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [batchId, setBatchId] = useState('');
  const [form, setForm] = useState(null);
  const [subsFor, setSubsFor] = useState(null);     // assignment whose submissions we're viewing
  const [subs, setSubs] = useState([]);
  const [share, setShare] = useState(null);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 2500); };

  const load = useCallback(() => {
    const params = {};
    if (type) params.type = type;
    if (batchId) params.batchId = batchId;
    classroomApi.list(params)
      .then((r) => setItems(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load classroom.'))
      .finally(() => setLoading(false));
  }, [type, batchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { batchApi.getAll().then((r) => setBatches(r.data.data || [])).catch(() => {}); }, []);

  const publish = async () => {
    if (!form.batch_id || !form.title) return;
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('batch_id', form.batch_id);
      fd.append('title', form.title);
      fd.append('type', form.type);
      if (form.instructions) fd.append('instructions', form.instructions);
      if (form.duration_minutes) fd.append('duration_minutes', form.duration_minutes);
      if (form.due_date) fd.append('due_date', form.due_date);
      if (form.file) fd.append('documents', form.file);
      await classroomApi.publish(fd);
      setForm(null); flash('Published to the batch.'); load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to publish.'); }
    finally { setSaving(false); }
  };

  const openSubs = async (item) => {
    setSubsFor(item); setSubs([]);
    try {
      const r = await classroomApi.submissions(item.id);
      setSubs(r.data.data.submissions || []);
    } catch (e) { setError(e.response?.data?.message || 'Unable to load submissions.'); }
  };

  const gradeSub = async (sub) => {
    const grade = window.prompt(`Grade for ${sub.student_name}:`, sub.grade || 'A');
    if (!grade) return;
    const feedback = window.prompt('Feedback (optional):', sub.feedback || '') || '';
    try {
      await classroomApi.grade(sub.id, { grade, feedback });
      flash('Graded.'); openSubs(subsFor);
    } catch (e) { setError(e.response?.data?.message || 'Unable to grade.'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove “${item.title}”?`)) return;
    try { await classroomApi.remove(item.id); flash('Removed.'); load(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to remove.'); }
  };

  const visible = items.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Academics' }, { label: 'Classroom' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Classroom</h1>
          <p className="text-xs text-gray-500">Publish classwork and homework to your batches — students are notified instantly.</p>
        </div>
        {can('classroom.create') && (
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm press"
          >
            <Icons.plus size={15} /> Publish work
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {notice}</div>}

      <SearchFilter
        value={search}
        onSearch={setSearch}
        placeholder="Search by title…"
        resultCount={visible.length}
        chips={{ value: type, onChange: setType, options: KINDS.map((k) => ({ value: k.value, label: k.label })) }}
        selects={[{
          key: 'batch', value: batchId, onChange: setBatchId, placeholder: 'All batches',
          options: batches.map((b) => ({ value: String(b.id), label: b.name })),
        }]}
        onClear={() => { setSearch(''); setType(''); setBatchId(''); }}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Icons.courses}
          title="No classwork yet"
          description="Publish classwork or homework and your students will see it immediately."
          actionLabel={can('classroom.create') ? 'Publish work' : undefined}
          onAction={can('classroom.create') ? () => setForm({ ...EMPTY }) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {visible.map((i, idx) => {
            const k = kindOf(i.type);
            const K = k.icon;
            const overdue = isOverdue(i.due_date);
            return (
              <article key={i.id} style={{ '--i': idx }}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${k.tone}`}>
                    <K size={11} /> {k.label}
                  </span>
                  {can('classroom.delete') && (
                    <button onClick={() => remove(i)} aria-label="Remove"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition press">
                      <Icons.trash size={14} />
                    </button>
                  )}
                </div>

                <h3 className="mt-2 text-sm font-bold text-gray-800 dark:text-slate-100 line-clamp-2">{i.title}</h3>
                {i.instructions && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{i.instructions}</p>}

                <dl className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><Icons.batches size={12} /> {i.batch_name}</span>
                  {i.duration_minutes && (
                    <span className="inline-flex items-center gap-1"><Icons.clock size={12} /> {i.duration_minutes} min</span>
                  )}
                  {i.due_date && (
                    <span className={`inline-flex items-center gap-1 font-semibold ${overdue ? 'text-rose-600' : ''}`}>
                      <Icons.attendance size={12} /> {overdue ? 'Overdue' : 'Due'} {i.due_date}
                    </span>
                  )}
                </dl>

                {i.file_url && (
                  <a href={i.file_url} target="_blank" rel="noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline">
                    <Icons.download size={13} /> {i.file_name} ({i.size_kb} KB)
                  </a>
                )}

                {['classwork', 'homework', 'lab', 'assignment'].includes(i.type) && (
                  <button onClick={() => openSubs(i)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 min-h-10 rounded-lg bg-gray-100 dark:bg-slate-800 text-[11px] font-bold press">
                    <Icons.view size={13} /> View submissions
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ---- Submissions / grading ---- */}
      {subsFor && (
        <Modal isOpen size="xl" title={`Submissions — ${subsFor.title}`} onClose={() => setSubsFor(null)}>
          {subs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-slate-800">
              {subs.map((s) => (
                <li key={s.id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{s.student_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{s.student_uid}</p>
                    {s.file_url ? (
                      <a href={s.file_url} target="_blank" rel="noreferrer"
                        className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                        <Icons.download size={12} /> {s.file_name} ({s.size_kb} KB)
                      </a>
                    ) : <p className="text-[11px] text-gray-400 italic">No file — note only</p>}
                    {s.note && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">“{s.note}”</p>}
                  </div>

                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    s.status === 'late' ? 'bg-amber-100 text-amber-700'
                      : s.status === 'graded' ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'}`}>
                    {s.grade ? `Grade ${s.grade}` : s.status}
                  </span>

                  <ContactActions name={s.student_name} phone={s.phone} email={s.email}
                    message={`Hello ${s.student_name}, regarding your submission for "${subsFor.title}".`}
                    onShare={() => setShare({ to: s.email, subject: `Your submission — ${subsFor.title}`, attachmentUrl: s.file_url || '' })} />

                  {can('classroom.update') && (
                    <button onClick={() => gradeSub(s)}
                      className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold bg-blue-600 text-white press">
                      Grade
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      <ShareByEmail
        open={!!share}
        onClose={() => setShare(null)}
        defaultTo={share?.to || ''}
        subject={share?.subject || ''}
        attachmentUrl={share?.attachmentUrl || ''}
      />

      {/* ---- Publish modal ---- */}
      {form && (
        <Modal
          isOpen
          title="Publish classwork / homework"
          onClose={() => setForm(null)}
          footer={<>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={publish} disabled={saving || !form.batch_id || !form.title}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Batch" required>
              <select className={inputCls} value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                <option value="">Select batch…</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </Field>
            <Field label="Type" required>
              <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Title" required>
                <input className={inputCls} placeholder="e.g. Homework 1 — Recursion"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Instructions">
                <textarea rows={3} className={inputCls} placeholder="What should students do?"
                  value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              </Field>
            </div>
            <Field label="Time duration (minutes)">
              <input type="number" min="1" className={inputCls} placeholder="90"
                value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </Field>
            <Field label="Due date">
              <input type="date" className={inputCls} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Attachment (optional)">
                <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                  className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClassroomPage;

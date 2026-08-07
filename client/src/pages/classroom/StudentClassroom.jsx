import React, { useCallback, useEffect, useState } from 'react';
import { PageHero } from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import SearchFilter from '../../components/common/SearchFilter';
import ContactActions from '../../components/common/ContactActions';
import { Icons } from '../../components/common/icons';
import { classroomApi } from '../../api/classroomApi';

const KIND = {
  classwork: { label: 'Classwork', tone: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400' },
  homework: { label: 'Homework', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  lab: { label: 'Lab', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  assignment: { label: 'Assignment', tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400' },
  material: { label: 'Material', tone: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300' },
};
const SUBMITTABLE = ['classwork', 'homework', 'lab', 'assignment'];

// The server computes this per student; the card just paints it.
//   done (green) submitted · missing (red) deadline passed, nothing in ·
//   pending (amber) still time.
const WORK_STATUS = {
  done: { label: 'Done', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', ring: 'border-emerald-200 dark:border-emerald-900' },
  missing: { label: 'Missing', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400', ring: 'border-rose-300 dark:border-rose-800' },
  pending: { label: 'Pending', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', ring: 'border-amber-200 dark:border-amber-900' },
};

const fmtDeadline = (dt) => {
  if (!dt) return null;
  const d = new Date(dt.replace(' ', 'T'));
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const STATUS = {
  submitted: { label: 'Submitted', tone: 'text-emerald-600', Icon: Icons.success },
  late: { label: 'Submitted late', tone: 'text-amber-600', Icon: Icons.warning },
  graded: { label: 'Graded', tone: 'text-brand-600', Icon: Icons.star },
  returned: { label: 'Returned', tone: 'text-rose-600', Icon: Icons.error },
};

const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none transition';

const StudentClassroom = () => {
  const [items, setItems] = useState([]);
  const [subs, setSubs] = useState({});         // material_id -> submission
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const [submitFor, setSubmitFor] = useState(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 2600); };

  const load = useCallback(() => {
    Promise.all([classroomApi.mine(type ? { type } : {}), classroomApi.mySubmissions()])
      .then(([c, s]) => {
        setItems(c.data.data || []);
        setSubs(Object.fromEntries((s.data.data || []).map((x) => [x.material_id, x])));
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load your classroom.'))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!file && !note.trim()) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      if (note) fd.append('note', note);
      if (file) fd.append('file', file);
      const res = await classroomApi.submit(submitFor.id, fd);
      flash(res.data.message);
      setSubmitFor(null); setNote(''); setFile(null);
      load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to submit.'); }
    finally { setBusy(false); }
  };

  const visible = items.filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()));
  const pending = visible.filter((i) => SUBMITTABLE.includes(i.type) && !subs[i.id]).length;

  return (
    <div className="space-y-5">
      <PageHero
        tone="violet"
        icon={Icons.courses}
        title="My Classroom"
        subtitle={pending > 0
          ? `${pending} item${pending === 1 ? '' : 's'} awaiting your submission.`
          : "You're all caught up."}
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">✓ {notice}</div>}

      <SearchFilter
        value={search} onSearch={setSearch} placeholder="Search your work…"
        resultCount={visible.length}
        chips={{ value: type, onChange: setType, options: Object.entries(KIND).map(([v, k]) => ({ value: v, label: k.label })) }}
        onClear={() => { setSearch(''); setType(''); }}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Icons.courses} title="No work assigned yet"
          description="Your trainer will post classwork and homework here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 stagger">
          {visible.map((i, idx) => {
            const k = KIND[i.type] || KIND.material;
            const sub = subs[i.id];
            const st = sub ? STATUS[sub.status] : null;
            const canSubmit = SUBMITTABLE.includes(i.type);
            // done / missing / pending — only meaningful for submittable work.
            const ws = canSubmit ? (WORK_STATUS[i.computed_status] || WORK_STATUS.pending) : null;
            const deadline = fmtDeadline(i.due_at);
            return (
              <article key={i.id} style={{ '--i': idx }}
                className={`p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-xs hover-lift ${
                  ws ? ws.ring : 'border-gray-100 dark:border-slate-800'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${k.tone}`}>{k.label}</span>
                    {ws && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ws.chip}`}>
                        {ws.label}
                      </span>
                    )}
                  </div>
                  <ContactActions name={i.trainer_name} message={`Hello ${i.trainer_name}, I have a question about "${i.title}".`} />
                </div>

                <h3 className="mt-2 text-sm font-bold text-gray-800 dark:text-slate-100">{i.title}</h3>
                {i.instructions && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{i.instructions}</p>}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><Icons.faculty size={12} /> {i.trainer_name}</span>
                  {i.duration_minutes && <span className="inline-flex items-center gap-1"><Icons.clock size={12} /> {i.duration_minutes} min</span>}
                  {deadline && (
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      i.computed_status === 'missing' ? 'text-rose-600' : ''}`}>
                      <Icons.attendance size={12} />
                      {i.computed_status === 'missing' ? 'Was due' : 'Due'} {deadline}
                    </span>
                  )}
                </div>

                {i.file_url && (
                  <a href={i.file_url} target="_blank" rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:underline">
                    <Icons.download size={13} /> {i.file_name}
                  </a>
                )}

                {/* Submission state */}
                {canSubmit && (
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-slate-800">
                    {sub ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-[11px] font-bold inline-flex items-center gap-1 ${st.tone}`}>
                            <st.Icon size={13} /> {st.label}
                            {sub.grade && <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-700">Grade {sub.grade}</span>}
                          </p>
                          {sub.feedback && <p className="text-[11px] text-gray-500 mt-0.5 truncate">“{sub.feedback}”</p>}
                          {sub.file_name && <p className="text-[10px] text-gray-400 truncate">{sub.file_name} · {sub.size_kb} KB</p>}
                        </div>
                        <button onClick={() => { setSubmitFor(i); setNote(sub.note || ''); }}
                          className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-slate-800 press">
                          Resubmit
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setSubmitFor(i); setNote(''); setFile(null); }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 min-h-11 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 press">
                        <Icons.upload size={14} /> Submit work
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Submit modal */}
      {submitFor && (
        <Modal isOpen title={`Submit — ${submitFor.title}`} onClose={() => setSubmitFor(null)}
          footer={<>
            <button onClick={() => setSubmitFor(null)} className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800">Cancel</button>
            <button onClick={submit} disabled={busy || (!file && !note.trim())}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-brand-600 text-white disabled:opacity-50">
              {busy ? 'Uploading…' : 'Submit'}
            </button>
          </>}>
          <div className="space-y-4">
            {submitFor.overdue && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-[11px] text-amber-700">
                The due date has passed — this will be marked <b>late</b>.
              </div>
            )}
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Note</span>
              <textarea rows={3} className={`${inputCls} mt-1`} placeholder="Anything your trainer should know…"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Project / file</span>
              <input type="file" onChange={(e) => setFile(e.target.files[0])}
                className="mt-1 w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700" />
              <span className="text-[10px] text-gray-400">ZIP, PDF, DOC or images — up to 25 MB.</span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentClassroom;

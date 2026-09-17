import React, { useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../common/icons';
import { AuthContext } from '../../context/AuthContext';
import { classApi } from '../../api/classApi';
import {
  Avatar, CommentList, FileLink, StatusChip, fmtDue, fmtWhen, inputCls, themeColor, typeOf, useToast, errText,
} from './classKit';
import { WorkForm } from './ClassworkTab';

/** Private thread between one student and the teachers, loaded on demand. */
const PrivateThread = ({ cls, itemId, studentId, initial }) => {
  const toast = useToast();
  const [comments, setComments] = useState(initial || null);
  const load = useCallback(() => {
    classApi.privateComments(cls.id, itemId, studentId).then((r) => setComments(r.data.data)).catch(() => setComments([]));
  }, [cls.id, itemId, studentId]);
  useEffect(() => { if (!initial) load(); }, [initial, load]);
  if (!comments) return <p className="text-[12px] text-gray-400">Loading…</p>;
  return (
    <CommentList
      compact
      comments={comments}
      placeholder="Add private comment…"
      onAdd={async (text) => {
        try { await classApi.addPrivateComment(cls.id, itemId, text, studentId); load(); }
        catch (e) { toast(errText(e, 'Could not send the comment.'), 'error'); throw e; }
      }}
    />
  );
};

/** One row of the teacher's "Student work" list. */
const StudentWorkRow = ({ cls, item, row, selected, onSelect, onSaved }) => {
  const toast = useToast();
  const [grade, setGrade] = useState(row.grade ?? '');
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const gradable = item.type !== 'material';
  const dirty = String(grade) !== String(row.grade ?? '') || String(feedback) !== String(row.feedback ?? '');

  const save = async () => {
    if (!String(grade).trim()) { toast('Enter a grade first.', 'warning'); return; }
    setSaving(true);
    try {
      const r = await classApi.grade(cls.id, item.id, row.student_id, { grade: String(grade).trim(), feedback });
      toast(r.data.message, 'success'); onSaved();
    } catch (e) { toast(errText(e, 'Could not save the grade.'), 'error'); } finally { setSaving(false); }
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        {gradable && (
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={selected}
            onChange={(e) => onSelect(e.target.checked)} aria-label={`Select ${row.student_name}`} />
        )}
        <Avatar name={row.student_name} size={32} />
        <div className="min-w-[140px] flex-1">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100">{row.student_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusChip status={row.work_status} />
            {row.submitted_at && <span className="text-[11px] text-gray-400">{fmtWhen(row.submitted_at)}</span>}
          </div>
        </div>
        {gradable && (
          <div className="flex items-center gap-1.5">
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade" aria-label={`Grade for ${row.student_name}`}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              className="w-20 px-2 py-1.5 text-[13px] text-center font-semibold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none" />
            {item.points ? <span className="text-[12px] text-gray-400">/{item.points}</span> : null}
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="erp-btn erp-btn-soft text-[11px] px-3 py-1.5 disabled:opacity-40">{saving ? '…' : 'Save'}</button>
          </div>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-expanded={open}
          title="Work, feedback and private comments" aria-label={`Open ${row.student_name}'s work`}>
          <Icons.chevronDown size={17} className={`transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="mt-3 ml-0 sm:ml-12 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Their work</p>
            {row.note && <p className="text-[13px] text-gray-700 dark:text-slate-200 whitespace-pre-wrap break-words rounded-lg bg-gray-50 dark:bg-slate-800/60 p-3">{row.note}</p>}
            <FileLink url={row.file_url} name={row.file_name} size={row.size_kb} />
            {!row.note && !row.file_url && <p className="text-[12px] text-gray-400">Nothing turned in.</p>}
            {gradable && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 pt-2">Feedback with the grade</p>
                <textarea rows={2} className={`${inputCls} resize-y`} maxLength={500} placeholder="Shown to the student when returned"
                  value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </>
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Private comments</p>
            <PrivateThread cls={cls} itemId={item.id} studentId={row.student_id} />
          </div>
        </div>
      )}
    </li>
  );
};

/** The student's "Your work" card. */
const YourWork = ({ cls, data, onChanged }) => {
  const toast = useToast();
  const { item, submission: sub, past_due: pastDue } = data;
  const [note, setNote] = useState(sub?.note || '');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNote(sub?.note || ''); }, [sub?.note]);

  const status = !sub ? (pastDue ? 'missing' : 'assigned')
    : sub.status === 'returned' ? 'returned'
    : sub.status === 'late' ? 'turned_in_late' : 'turned_in';
  const locked = sub && ['graded', 'returned'].includes(sub.status);
  const editable = !sub;

  const turnIn = async () => {
    setBusy(true);
    try { const r = await classApi.turnIn(cls.id, item.id, { note, file }); toast(r.data.message, 'success'); setFile(null); onChanged(); }
    catch (e) { toast(errText(e, 'Could not turn in.'), 'error'); } finally { setBusy(false); }
  };
  const unsubmit = async () => {
    if (!window.confirm('Unsubmit? Turn it in again before the due date.')) return;
    setBusy(true);
    try { const r = await classApi.unsubmit(cls.id, item.id); toast(r.data.message, 'success'); onChanged(); }
    catch (e) { toast(errText(e, 'Could not unsubmit.'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="erp-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-gray-800 dark:text-slate-100">Your work</h3>
          {sub?.status === 'returned' && sub.grade !== null
            ? <span className="text-[15px] font-bold text-gray-800 dark:text-slate-100">{sub.grade}{item.points ? `/${item.points}` : ''}</span>
            : <StatusChip status={status} />}
        </div>

        {sub?.status === 'returned' && sub.feedback && (
          <p className="text-[13px] rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200 p-3 whitespace-pre-wrap">{sub.feedback}</p>
        )}

        {sub ? (
          <>
            {sub.note && <p className="text-[13px] text-gray-700 dark:text-slate-200 whitespace-pre-wrap break-words">{sub.note}</p>}
            <FileLink url={sub.file_url} name={sub.file_name} size={sub.size_kb} />
            {!locked && (
              <button type="button" onClick={unsubmit} disabled={busy} className="erp-btn erp-btn-outline w-full text-xs py-2.5">Unsubmit</button>
            )}
            {sub.status === 'graded' && <p className="text-[11px] text-gray-400">Your trainer is grading this.</p>}
          </>
        ) : (
          <>
            <textarea rows={item.type === 'question' ? 5 : 3} className={`${inputCls} resize-y`} maxLength={5000}
              placeholder={item.type === 'question' ? 'Your answer' : 'Add a note (optional)'} value={note} disabled={!editable}
              onChange={(e) => setNote(e.target.value)} />
            {item.type !== 'question' && (
              <label className="erp-btn erp-btn-outline w-full text-xs py-2.5 cursor-pointer">
                <Icons.plus size={13} aria-hidden="true" /> {file ? file.name.slice(0, 30) : 'Add a file (up to 25 MB)'}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
            <button type="button" onClick={turnIn} disabled={busy || (!note.trim() && !file)}
              className="erp-btn erp-btn-primary w-full text-xs py-2.5 disabled:opacity-50">
              {busy ? 'Turning in…' : pastDue ? 'Turn in late' : 'Turn in'}
            </button>
          </>
        )}
      </div>

      <div className="erp-card p-4">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Icons.users size={15} aria-hidden="true" /> Private comments
        </p>
        <PrivateThread cls={cls} itemId={item.id} initial={data.private_comments} />
      </div>
    </div>
  );
};

/** The full-screen panel for one piece of classwork. */
const WorkDetail = ({ cls, itemId, onClose, onChanged }) => {
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(false);
  const [topics, setTopics] = useState([]);
  const [returning, setReturning] = useState(false);

  const load = useCallback(() => {
    classApi.work(cls.id, itemId)
      .then((r) => setData(r.data.data))
      .catch((e) => { toast(errText(e, 'Could not open this classwork.'), 'error'); onClose(); });
  }, [cls.id, itemId, onClose, toast]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const changed = () => { load(); onChanged(); };

  const returnSelected = async () => {
    setReturning(true);
    try {
      const r = await classApi.returnWork(cls.id, itemId, [...selected]);
      toast(r.data.message, 'success'); setSelected(new Set()); changed();
    } catch (e) { toast(errText(e, 'Could not return the work.'), 'error'); } finally { setReturning(false); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this classwork? Its submissions, grades and comments are deleted too.')) return;
    try { await classApi.removeWork(cls.id, itemId); toast('Classwork deleted', 'success'); onChanged(); onClose(); }
    catch (e) { toast(errText(e, 'Could not delete.'), 'error'); }
  };

  const openEdit = async () => {
    try { const r = await classApi.classwork(cls.id); setTopics(r.data.data.topics); setEditing(true); }
    catch (e) { toast(errText(e, 'Could not open the editor.'), 'error'); }
  };

  const tone = themeColor(cls.theme);
  const item = data?.item;
  const T = item ? typeOf(item.type) : null;
  const teach = data && data.role !== 'student';
  const returnable = teach ? data.roster.filter((r) => ['graded', 'turned_in', 'turned_in_late'].includes(r.work_status)) : [];

  return createPortal(
    <div className="fixed inset-0 z-[1300] bg-[var(--surface-page,#f3f4f6)] dark:bg-slate-950 overflow-y-auto" role="dialog" aria-modal="true" aria-label={item?.title || 'Classwork'}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Close">
          <Icons.close size={20} aria-hidden="true" />
        </button>
        <span className="text-[14px] font-semibold text-gray-800 dark:text-slate-100 truncate flex-1">{cls.name}</span>
        {teach && item && (
          <span className="flex items-center gap-1">
            <button type="button" onClick={openEdit} className="erp-btn erp-btn-soft text-xs px-3 py-2"><Icons.edit size={13} aria-hidden="true" /> Edit</button>
            <button type="button" onClick={remove} className="p-2 text-gray-400 hover:text-rose-600" title="Delete" aria-label="Delete classwork">
              <Icons.trash size={16} aria-hidden="true" />
            </button>
          </span>
        )}
      </header>

      {!data ? (
        <div className="max-w-5xl mx-auto p-6"><div className="erp-card h-56 animate-pulse" /></div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 min-w-0">
            <div className="flex items-start gap-4">
              <span className="grid place-items-center h-11 w-11 rounded-full text-white shrink-0" style={{ background: item.type === 'material' ? '#64748b' : tone }}>
                <T.icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: tone }}>{item.title}</h1>
                <p className="text-[12px] text-gray-500 mt-1">
                  {cls.trainer_name ? `${cls.trainer_name} · ` : ''}{fmtWhen(item.created_at)}{item.topic_name ? ` · ${item.topic_name}` : ''}
                </p>
                <div className="flex flex-wrap justify-between gap-2 mt-2 pb-3 border-b-2" style={{ borderColor: tone }}>
                  <span className="text-[13px] font-semibold text-gray-700 dark:text-slate-200">
                    {item.type === 'material' ? T.label : item.points !== null && item.points !== undefined ? `${item.points} points` : 'Ungraded'}
                  </span>
                  {item.type !== 'material' && <span className="text-[13px] font-semibold text-gray-700 dark:text-slate-200">{fmtDue(item.due_at)}</span>}
                </div>
              </div>
            </div>

            {item.instructions && <p className="text-[14px] text-gray-800 dark:text-slate-200 whitespace-pre-wrap break-words">{item.instructions}</p>}
            {item.file_url && <FileLink url={item.file_url} name={item.file_name} size={item.size_kb} />}

            {teach && item.type !== 'material' && (
              <section className="erp-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-6">
                    {[['Turned in', data.summary.turned_in], ['Assigned', data.summary.assigned], ['Missing', data.summary.missing], ['Returned', data.summary.returned]].map(([l, n]) => (
                      <div key={l}><p className="text-2xl font-light text-gray-800 dark:text-slate-100">{n}</p><p className="text-[11px] text-gray-500">{l}</p></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-[12px] text-brand-600 hover:underline"
                      onClick={() => setSelected(new Set(returnable.map((r) => r.student_id)))}>
                      Select all to return
                    </button>
                    <button type="button" onClick={returnSelected} disabled={returning || selected.size === 0}
                      className="erp-btn erp-btn-primary text-xs px-4 py-2 disabled:opacity-50">
                      {returning ? 'Returning…' : `Return${selected.size ? ` (${selected.size})` : ''}`}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Saving a grade keeps it as a draft. Students see grades and feedback only after you return their work.
                </p>
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {data.roster.map((row) => (
                    <StudentWorkRow key={row.student_id} cls={cls} item={item} row={row}
                      selected={selected.has(row.student_id)}
                      onSelect={(on) => setSelected((s) => { const n = new Set(s); if (on) n.add(row.student_id); else n.delete(row.student_id); return n; })}
                      onSaved={changed} />
                  ))}
                  {data.roster.length === 0 && <li className="py-4 text-[13px] text-gray-500">No students in this class yet.</li>}
                </ul>
              </section>
            )}

            <section className="border-t border-gray-200 dark:border-slate-800 pt-4">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Icons.chat size={15} aria-hidden="true" /> {data.comments.length ? `${data.comments.length} class comment${data.comments.length === 1 ? '' : 's'}` : 'Class comments'}
              </p>
              <CommentList
                comments={data.comments}
                canDelete={(c) => teach || c.user_id === user?.id}
                onDelete={async (c) => { await classApi.removeComment(cls.id, c.id); load(); }}
                onAdd={async (text) => {
                  try { await classApi.comment(cls.id, { material_id: item.id, body: text }); load(); }
                  catch (e) { toast(errText(e, 'Could not post the comment.'), 'error'); throw e; }
                }}
              />
            </section>
          </div>

          <aside className="min-w-0">
            {data.role === 'student' && item.type !== 'material' && <YourWork cls={cls} data={data} onChanged={changed} />}
          </aside>
        </div>
      )}

      {editing && item && (
        <WorkForm cls={cls} topics={topics} initial={item}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); changed(); }} />
      )}
    </div>,
    document.body
  );
};

export default WorkDetail;

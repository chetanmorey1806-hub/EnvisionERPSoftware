import React, { useContext, useState } from 'react';
import { Icons } from '../common/icons';
import { NotificationContext } from '../../context/NotificationContext';

/**
 * Shared parts of the Classroom screens: the class colours, the status chips,
 * dates, avatars and the comment list. Declared here rather than inside the
 * pages so a comment box keeps its cursor while you type.
 */

export const THEMES = {
  red: ['#dc2626', '#f97316'],
  orange: ['#ea580c', '#f59e0b'],
  amber: ['#b45309', '#eab308'],
  green: ['#15803d', '#65a30d'],
  teal: ['#0f766e', '#0891b2'],
  blue: ['#1d4ed8', '#0ea5e9'],
  indigo: ['#4338ca', '#6366f1'],
  violet: ['#6d28d9', '#c026d3'],
  pink: ['#be185d', '#f43f5e'],
  slate: ['#1e293b', '#64748b'],
};
export const themeStyle = (theme) => {
  const [a, b] = THEMES[theme] || THEMES.blue;
  return { background: `linear-gradient(120deg, ${a} 0%, ${b} 100%)` };
};
export const themeColor = (theme) => (THEMES[theme] || THEMES.blue)[0];

export const inputCls =
  'w-full px-3 py-2.5 text-[13px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 ' +
  'rounded-lg text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/40 outline-none transition';

export const WORK_TYPES = {
  assignment: { label: 'Assignment', icon: Icons.admissions },
  question: { label: 'Question', icon: Icons.help },
  material: { label: 'Material', icon: Icons.library },
  classwork: { label: 'Classwork', icon: Icons.courses },
  homework: { label: 'Homework', icon: Icons.admissions },
  lab: { label: 'Lab', icon: Icons.exams },
};
export const typeOf = (t) => WORK_TYPES[t] || WORK_TYPES.assignment;

const STATUS = {
  assigned: ['Assigned', 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'],
  missing: ['Missing', 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'],
  turned_in: ['Turned in', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'],
  turned_in_late: ['Done late', 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'],
  graded: ['Draft grade', 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'],
  draft: ['Draft grade', 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'],
  returned: ['Returned', 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'],
};
export const statusLabel = (s) => (STATUS[s] || [s || ''])[0];
export const StatusChip = ({ status }) => {
  if (!status) return null;
  const [label, cls] = STATUS[status] || [status, STATUS.assigned[1]];
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
};

/** 'YYYY-MM-DD HH:MM:SS' (server local time) → Date */
export const toDate = (s) => (s ? new Date(String(s).replace(' ', 'T')) : null);
export const fmtWhen = (s) => {
  const d = toDate(s);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
export const fmtDue = (s) => (s ? `Due ${fmtWhen(s)}` : 'No due date');
/** Date → value for <input type="datetime-local"> */
export const toLocalInput = (s) => (s ? String(s).replace(' ', 'T').slice(0, 16) : '');

export const Avatar = ({ name, size = 32, tone }) => {
  const initials = String(name || '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className="inline-grid place-items-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: tone || '#64748b' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};

export const FileLink = ({ url, name, size }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-brand-400 text-[12px] text-gray-700 dark:text-slate-200 transition">
      <Icons.folder size={15} className="text-brand-600 shrink-0" aria-hidden="true" />
      <span className="truncate">{name || 'Attachment'}</span>
      {size ? <span className="text-gray-400 shrink-0">{size} KB</span> : null}
    </a>
  ) : null;

/** useToast() → (message, type) — falls back silently outside the provider. */
const noop = () => {};
export const useToast = () => {
  const ctx = useContext(NotificationContext);
  return ctx?.showToast || noop;
};
export const errText = (e, fallback) => e?.response?.data?.message || fallback;

/**
 * A list of comments with an "add" box underneath.
 * `canDelete(comment)` decides the bin per comment.
 */
export const CommentList = ({ comments = [], onAdd, onDelete, canDelete, placeholder = 'Add class comment…', compact }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await onAdd(text.trim()); setText(''); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2.5 group">
          <Avatar name={c.author_name} size={compact ? 26 : 30} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px]">
              <span className="font-semibold text-gray-800 dark:text-slate-100">{c.author_name || 'Someone'}</span>
              <span className="text-gray-400 ml-2">{fmtWhen(c.created_at)}</span>
            </p>
            <p className="text-[13px] text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">{c.body}</p>
          </div>
          {onDelete && canDelete?.(c) && (
            <button type="button" onClick={() => onDelete(c)} title="Delete comment"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition">
              <Icons.trash size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <div className="flex items-center gap-2">
          <input
            className={inputCls}
            placeholder={placeholder}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button type="button" onClick={send} disabled={busy || !text.trim()} aria-label="Post comment"
            className="p-2.5 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-40 transition">
            <Icons.send size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

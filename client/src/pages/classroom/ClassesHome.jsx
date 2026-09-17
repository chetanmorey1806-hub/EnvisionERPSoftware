import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import { Icons } from '../../components/common/icons';
import { usePermissions } from '../../hooks/usePermissions';
import { classApi } from '../../api/classApi';
import {
  themeStyle, themeColor, inputCls, Avatar, fmtWhen, useToast, errText,
} from '../../components/classroom/classKit';

/**
 * Classroom home — one card per class, as in Google Classroom.
 *
 * A class is a batch, so classes are not created here: a batch scheduled on the
 * Batches page appears as a class automatically. Students join one with the
 * code their trainer gives them.
 */
const ClassCard = ({ c }) => {
  const teach = c.role !== 'student';
  return (
    <Link to={`/classroom/${c.id}`}
      className="group erp-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500/50">
      <div className="relative h-24 px-4 py-3 text-white" style={themeStyle(c.theme)}>
        <h3 className="text-[17px] font-bold leading-tight line-clamp-2 group-hover:underline">{c.name}</h3>
        <p className="text-[12px] text-white/90 truncate mt-0.5">{c.course_name || c.code}</p>
        <p className="text-[12px] text-white/80 truncate">{c.trainer_name || 'No trainer assigned'}</p>
        <span className="absolute right-4 -bottom-6">
          <Avatar name={c.trainer_name || c.name} size={52} tone={themeColor(c.theme)} />
        </span>
      </div>
      <div className="flex-1 px-4 pt-8 pb-3 space-y-1.5 text-[12px] text-gray-600 dark:text-slate-300 min-h-[92px]">
        {teach ? (
          <>
            <p><span className="text-gray-400">Class code</span> <span className="font-mono font-bold tracking-wider text-gray-800 dark:text-slate-100">{c.class_code}</span></p>
            <p>{c.students} student{c.students === 1 ? '' : 's'}</p>
            {c.to_review > 0 && <p className="font-semibold text-brand-600 dark:text-brand-300">{c.to_review} to review</p>}
          </>
        ) : (
          <>
            {(c.due_soon || []).map((d) => (
              <p key={d.id} className="truncate"><span className="text-gray-400">Due {fmtWhen(d.due_at)}</span> · {d.title}</p>
            ))}
            {!c.due_soon?.length && <p className="text-gray-400">No work due soon</p>}
            {c.missing > 0 && <p className="font-semibold text-rose-600">{c.missing} missing</p>}
          </>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[12px]">
        <span className="text-gray-400">{teach ? 'Teaching' : `${c.to_do} to do`}</span>
        <Icons.chevronRight size={16} className="text-gray-400" aria-hidden="true" />
      </div>
    </Link>
  );
};

const ClassesHome = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, role } = usePermissions();
  const [archived, setArchived] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    classApi.list(archived)
      .then((r) => setClasses(r.data.data || []))
      .catch((e) => setError(errText(e, 'Could not load your classes.')))
      .finally(() => setLoading(false));
  }, [archived]);
  useEffect(load, [load]);

  const join = async () => {
    setBusy(true);
    try {
      const r = await classApi.join(code.trim());
      toast(r.data.message, 'success');
      setJoining(false); setCode('');
      navigate(`/classroom/${r.data.data.id}`);
    } catch (e) {
      toast(errText(e, 'Could not join that class.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const isStudent = role === 'student';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">Classroom</h1>
          <p className="text-[13px] text-gray-500 dark:text-slate-400">
            {isStudent ? 'Your classes, work to do and grades.' : 'Every batch is a class: post work, grade it and return it.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-[12px]">
            {[['Active', false], ['Archived', true]].map(([label, val]) => (
              <button key={label} type="button" onClick={() => setArchived(val)}
                className={`px-3 py-2 ${archived === val ? 'bg-brand-600 text-white font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
          {isStudent && (
            <button type="button" onClick={() => setJoining(true)} className="erp-btn erp-btn-primary text-xs px-4 py-2">
              <Icons.plus size={14} aria-hidden="true" /> Join class
            </button>
          )}
          {can('batches.create') && (
            <Link to="/batches/new" className="erp-btn erp-btn-outline text-xs px-4 py-2">
              <Icons.plus size={14} aria-hidden="true" /> New batch
            </Link>
          )}
        </div>
      </div>

      {error && <div className="erp-card px-4 py-3 text-xs text-rose-600">{error}</div>}

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3].map((i) => <div key={i} className="erp-card h-56 animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="erp-card text-center py-14 px-4">
          <Icons.courses size={40} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {archived ? 'No archived classes' : 'No classes yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {isStudent
              ? 'Ask your trainer for the class code, then press "Join class".'
              : 'A class appears here as soon as an active batch is scheduled with a trainer.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {classes.map((c) => <ClassCard key={c.id} c={c} />)}
        </div>
      )}

      <Modal isOpen={joining} onClose={() => setJoining(false)} title="Join class" size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" className="erp-btn erp-btn-soft text-xs px-4 py-2" onClick={() => setJoining(false)}>Cancel</button>
            <button type="button" className="erp-btn erp-btn-primary text-xs px-4 py-2" disabled={busy || code.trim().length < 6} onClick={join}>
              {busy ? 'Joining…' : 'Join'}
            </button>
          </div>
        )}>
        <p className="text-[13px] text-gray-600 dark:text-slate-300 mb-3">
          Ask your trainer for the class code, then enter it here.
        </p>
        <input className={`${inputCls} font-mono text-lg tracking-[0.3em] uppercase`} maxLength={8} autoFocus
          data-no-caps="true" placeholder="Class code" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.trim().length >= 6) join(); }} />
        <p className="text-[11px] text-gray-400 mt-2">Class codes are 7 letters or numbers, with no spaces or symbols.</p>
      </Modal>
    </div>
  );
};

export default ClassesHome;

import React, { useCallback, useEffect, useState } from 'react';
import Breadcrumb from './Breadcrumb';
import { useT } from '../../context/LanguageContext';

/**
 * PageKit — the shared furniture of a list screen.
 *
 * These pages used to be hardcoded arrays of invented people. The point of this
 * kit is that a page now has exactly one honest state for "there is no data":
 * it says so, and tells you how to create some. It never invents a row.
 */

export const PageHeader = ({ crumbs = [], icon, title, subtitle, action }) => {
  const { t } = useT();
  return (
    <>
      <Breadcrumb items={crumbs.map((c) => ({ label: t(c) }))} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            {icon && (
              <span className="w-8 h-8 grid place-items-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                {icon}
              </span>
            )}
            {t(title)}
          </h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{t(subtitle)}</p>}
        </div>
        {action}
      </div>
    </>
  );
};

/** The honest empty state. No fake rows, ever. */
export const Empty = ({ title, hint }) => {
  const { t } = useT();
  return (
    <div className="p-10 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
      <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t(title)}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{t(hint)}</p>}
    </div>
  );
};

export const Flash = ({ error, notice }) => (
  <>
    {error && (
      <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-semibold text-rose-700">
        {error}
      </div>
    )}
    {notice && (
      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700">
        {notice}
      </div>
    )}
  </>
);

export const Table = ({ headers, children }) => {
  const { t } = useT();
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left font-bold uppercase tracking-wide px-3 py-2">{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
};

const PILL = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  issued: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-500',
};

export const Pill = ({ s }) => {
  const { t } = useT();
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${PILL[s] || PILL.pending}`}>
      {t(String(s || '—').replace(/_/g, ' '))}
    </span>
  );
};

export const Btn = ({ tone = 'gray', children, ...rest }) => {
  const tones = {
    gray: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200',
    primary: 'bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900',
    green: 'bg-emerald-600 text-white',
    rose: 'text-rose-600',
  };
  return (
    <button {...rest} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
};

/**
 * Fetch-once list state. Every page gets the same loading / error / empty
 * behaviour, so none of them has to invent a placeholder row to look alive.
 */
export function useList(fetcher, deps = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetcher();
      const d = r?.data?.data;
      setItems(Array.isArray(d) ? d : d?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Something went wrong.');
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };
  const fail = (e) => setError(e?.response?.data?.message || e.message || 'Something went wrong.');

  return { items, setItems, loading, error, notice, load, flash, fail, setError };
}

export const Loading = () => {
  const { t } = useT();
  return <p className="text-xs text-gray-500 py-10 text-center">{t('Loading…')}</p>;
};

export const dateStr = (d) =>
  (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

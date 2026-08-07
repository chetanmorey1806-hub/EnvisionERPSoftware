import React, { useCallback, useEffect, useState } from 'react';
import { PageHero } from './PageShell';
import { useT } from '../../context/LanguageContext';

/**
 * PageKit — the shared furniture of a list screen.
 *
 * These pages used to be hardcoded arrays of invented people. The point of this
 * kit is that a page now has exactly one honest state for "there is no data":
 * it says so, and tells you how to create some. It never invents a row.
 */

/**
 * `icon` here predates the shared hero and is passed as a rendered element
 * (`<Icons.fees size={16} />`), not as a component — so it is dropped into the
 * hero's icon slot wrapped in a component that just returns it.
 */
export const PageHeader = ({ icon, title, subtitle, action, tone = 'brand', meta }) => (
  <PageHero
    tone={tone}
    icon={icon ? () => icon : undefined}
    title={title}
    subtitle={subtitle}
    action={action}
    meta={meta}
  />
);

/** The honest empty state. No fake rows, ever. */
export const Empty = ({ title, hint }) => {
  const { t } = useT();
  return (
    <div className="p-10 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
      <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{t(title)}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{t(hint)}</p>}
    </div>
  );
};

export const Flash = ({ error, notice }) => (
  <>
    {error && (
      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-fade-in">
        {error}
      </div>
    )}
    {notice && (
      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-fade-in">
        {notice}
      </div>
    )}
  </>
);

export const Table = ({ headers, children }) => {
  const { t } = useT();
  return (
    <div className="erp-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50/70 dark:bg-slate-900/40 text-gray-400 dark:text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-3">{t(h)}</th>
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${PILL[s] || PILL.pending}`}>
      {t(String(s || '—').replace(/_/g, ' '))}
    </span>
  );
};

export const Btn = ({ tone = 'gray', children, ...rest }) => {
  const tones = {
    gray: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700',
    primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700',
    green: 'bg-verdant-500 text-white hover:bg-verdant-600',
    rose: 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  };
  return (
    <button {...rest} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors press disabled:opacity-50 ${tones[tone]}`}>
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

import React from 'react';
import { Icons } from '../common/icons';
import { useT } from '../../context/LanguageContext';

/**
 * FORM KIT — the shared parts of every List → New → Edit form.
 *
 * Every label, hint, section title and button runs through t(), so a form is
 * written once in English and renders in English / मराठी / हिंदी.
 */

export const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-sm bg-white dark:bg-slate-900 border border-gray-200 ' +
  'dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 ' +
  'focus:ring-2 focus:ring-blue-500/40 outline-none transition';

/**
 * Same input, shorter. For forms that must fit one screen without scrolling.
 * Still 40px tall, so it stays comfortably tappable on a phone.
 */
export const inputClsCompact =
  'w-full px-3 py-2 min-h-10 text-sm bg-white dark:bg-slate-900 border border-gray-200 ' +
  'dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 ' +
  'focus:ring-2 focus:ring-blue-500/40 outline-none transition';

/** One labelled input. `required` paints the asterisk; validation stays with the form. */
export const Field = ({ label, required, hint, children }) => {
  const { t } = useT();
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
        {t(label)} {required && <span className="text-rose-500">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[10px] text-gray-400 leading-tight block">{t(hint)}</span>}
    </label>
  );
};

const COL_CLS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

/**
 * A titled card grouping related fields.
 * `cols` is how the fields lay out INSIDE the card (1 when the card itself is a
 * narrow column of a side-by-side layout). `dense` tightens it for one-screen forms.
 */
export const Section = ({ icon: Icon = Icons.courses, title, children, cols = 2, dense = false, className = '' }) => {
  const { t } = useT();
  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 ${
        dense ? 'p-4' : 'p-5'
      } ${className}`}
    >
      <h2 className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 pb-2 border-b border-gray-100 dark:border-slate-800 ${
        dense ? 'mb-3' : 'mb-4'
      }`}>
        {Icon && <Icon size={14} />} {t(title)}
      </h2>
      <div className={`grid grid-cols-1 ${dense ? 'gap-3' : 'gap-4'} ${COL_CLS[cols] ?? COL_CLS[2]}`}>
        {children}
      </div>
    </section>
  );
};

/** Title + subtitle + Cancel/Save — identical on every form. */
export const FormHeader = ({ title, subtitle, onCancel, saving, saveLabel, disabled }) => {
  const { t } = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t(title)}</h1>
        {subtitle && <p className="text-xs text-gray-500">{t(subtitle)}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 min-h-11 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 press">
          {t('Cancel')}
        </button>
        <button type="submit" disabled={saving || disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 press">
          <Icons.check size={15} /> {saving ? t('Saving…') : t(saveLabel)}
        </button>
      </div>
    </div>
  );
};

/** The red band above a form. Conflict-engine rejections land here verbatim. */
export const FormError = ({ error }) =>
  error ? (
    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs flex items-start gap-2">
      <Icons.warning size={14} className="shrink-0 mt-px" />
      <span className="whitespace-pre-line">{error}</span>
    </div>
  ) : null;

/** Skeleton shown while an Edit form fetches its record. */
export const FormSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
    ))}
  </div>
);

/** Weekday multi-select — the shape the batch conflict engine expects. */
export const DAYS = [
  { v: 'mon', l: 'Mon' }, { v: 'tue', l: 'Tue' }, { v: 'wed', l: 'Wed' },
  { v: 'thu', l: 'Thu' }, { v: 'fri', l: 'Fri' }, { v: 'sat', l: 'Sat' }, { v: 'sun', l: 'Sun' },
];

export const DayPicker = ({ value = [], onChange }) => {
  const { t } = useT();
  const toggle = (d) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map((d) => (
        <button
          key={d.v}
          type="button"
          onClick={() => toggle(d.v)}
          className={`px-3 py-2 min-h-9 rounded-lg text-[11px] font-bold transition press ${
            value.includes(d.v)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {t(d.l)}
        </button>
      ))}
    </div>
  );
};

import React from 'react';

/**
 * The small parts both settings screens are built from — ported in spirit from
 * the bk-steels Setting / Global Setting screens, written in this app's
 * Tailwind idiom.
 *
 * They are declared here rather than inside the pages on purpose: a component
 * defined during render is a new type on every keystroke, and React throws the
 * old field away — taking the cursor with it.
 */

export const inputCls =
  'w-full px-3 py-2.5 min-h-11 text-xs bg-white dark:bg-slate-900 border border-gray-200 ' +
  'dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100 ' +
  'focus:ring-2 focus:ring-brand-500/40 outline-none transition disabled:opacity-60';

/** A label on the left, its control on the right. Wraps on a narrow screen. */
export const Row = ({ label, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-t border-gray-100 dark:border-slate-800 first:border-t-0 first:pt-0">
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-100">{label}</p>
      {hint && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** Segmented control — two or three mutually exclusive states. */
export const Segmented = ({ value, options, onChange }) => (
  <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
    {options.map((o) => {
      const on = value === o.value;
      const Icon = o.icon;
      return (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={on}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] transition ${
            on
              ? 'bg-brand-600 text-white font-bold'
              : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          {Icon && <Icon size={14} aria-hidden="true" />}
          {o.label}
        </button>
      );
    })}
  </div>
);

/** An on/off preference — a switch, because it is not a record. */
export const Switch = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`w-11 h-6 p-0.5 rounded-full flex items-center transition-colors ${
      on ? 'bg-brand-600 justify-end' : 'bg-gray-300 dark:bg-slate-700 justify-start'
    }`}
  >
    <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
  </button>
);

/** A labelled form field inside a grid. `wide` makes it span the full row. */
export const Field = ({ label, hint, wide, children }) => (
  <div className={`min-w-0 ${wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{hint}</p>}
  </div>
);

/** The grid the fields sit in — one column on a phone, three on a desktop. */
export const FieldGrid = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
);

/** The Save button every card carries in its header. */
export const SaveButton = ({ onClick, saving, disabled, label = 'Save' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={saving || disabled}
    className="erp-btn erp-btn-primary text-xs px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {saving ? 'Saving…' : label}
  </button>
);

export default Row;

import React from 'react';
import { useT } from '../../context/LanguageContext';

/**
 * PageShell — the furniture every screen opens with.
 *
 * One hero band, one grid of stat tiles, one card. Fifty screens built from the
 * same three pieces read as one product; fifty screens each inventing their own
 * header does not. Pages compose these instead of restating a dozen utilities.
 */

/** Hero gradients, keyed by the tone their menu section declares. */
const HERO_TONE = {
  brand: 'erp-hero-blue',
  amber: '',            /* the default saffron band */
  saffron: '',
  violet: 'erp-hero-violet',
  cyan: 'erp-hero-cyan',
  green: 'erp-hero-green',
  rose: 'erp-hero-rose',
  slate: 'erp-hero-slate',
};

/**
 * The banded page header.
 *
 *   <PageHero
 *     tone="brand"
 *     icon={Icons.students}
 *     title="Student Directory"
 *     subtitle="Every enrolled learner"
 *     meta={[{ label: 'Total', value: 248 }]}
 *     action={<button …>Add student</button>}
 *   />
 */
export const PageHero = ({
  tone = 'amber',
  icon: Icon,
  title,
  subtitle,
  meta = [],
  action,
  children,
}) => {
  const { t } = useT();

  return (
    <header className={`erp-hero ${HERO_TONE[tone] ?? ''} mb-5`}>
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon && (
            <span className="hidden sm:grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20 border border-white/25 backdrop-blur-sm">
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold leading-tight truncate">{t(title)}</h1>
            {subtitle && (
              <p className="text-[13px] font-medium text-white/85 mt-0.5">{t(subtitle)}</p>
            )}
          </div>
        </div>

        {/* Readouts (counts, dates, financial year) sit as glass chips. */}
        {(meta.length > 0 || action) && (
          <div className="flex flex-wrap items-center gap-2.5">
            {meta.map((m) => (
              <div key={m.label} className="erp-hero-chip text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/70">
                  {t(m.label)}
                </p>
                <p className="text-sm font-extrabold leading-tight mt-0.5">{m.value}</p>
              </div>
            ))}
            {action}
          </div>
        )}
      </div>

      {children && <div className="relative z-10 mt-4">{children}</div>}
    </header>
  );
};

/**
 * Stat tile — pastel icon chip, a large number, a quiet label. `to` turns the
 * whole tile into a link and surfaces the corner arrow from the reference.
 */
export const StatCard = ({ icon: Icon, tone = 'brand', value, label, sub, onClick }) => {
  const { t } = useT();
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`erp-stat erp-card-interactive text-left w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className={`erp-chip erp-chip-${tone}`}>
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
          </span>
        ) : (
          <span />
        )}
        {onClick && (
          <span className="text-gray-300 dark:text-slate-600 text-sm" aria-hidden="true">↗</span>
        )}
      </div>

      <div>
        <p className="erp-stat-value">{value}</p>
        <p className="erp-stat-label mt-1.5">{t(label)}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
    </Tag>
  );
};

/** Responsive stat grid — four across on desktop, as in the reference. */
export const StatGrid = ({ children, cols = 4 }) => (
  <div
    className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
      cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
    }`}
  >
    {children}
  </div>
);

/** A titled content surface. The default home for a table, form or list. */
export const Panel = ({ title, subtitle, action, icon: Icon, tone = 'slate', children, className = '' }) => {
  const { t } = useT();

  return (
    <section className={`erp-card overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span className={`erp-chip erp-chip-${tone} h-9 w-9`}>
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{t(title)}</h2>
              )}
              {subtitle && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{t(subtitle)}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
};

/** The full-width accent strip — one headline figure, stated loudly. */
export const Band = ({ icon: Icon, label, value, note, footnote }) => {
  const { t } = useT();

  return (
    <div className="erp-band">
      {Icon && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 border border-white/25">
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-white/80">{t(label)}</p>
        <p className="text-xl sm:text-2xl font-extrabold leading-tight mt-0.5">{value}</p>
      </div>
      {(note || footnote) && (
        <div className="text-right shrink-0">
          {note && <p className="text-[11px] text-white/75">{note}</p>}
          {footnote && <p className="text-xs font-bold">{footnote}</p>}
        </div>
      )}
    </div>
  );
};

export default PageHero;

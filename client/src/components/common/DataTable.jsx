import React from 'react';
import { SkeletonRow } from './Skeleton';
import EmptyState from './EmptyState';
import { useT } from '../../context/LanguageContext';

/**
 * Responsive data table.
 *
 * Desktop (>= md): a real <table> with a sticky header.
 * Mobile  (<  md): each row collapses into a card — the first column becomes the
 *                  card title, the rest render as label/value pairs. A 6-column
 *                  table is unreadable on a 360px screen; cards are not.
 */
const DataTable = ({
  columns,
  data = [],
  actions,
  isLoading = false,
  emptyMessage = 'No records found.',
}) => {
  const { t } = useT();

  if (isLoading) {
    return (
      <div className="erp-card w-full p-4">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }

  const [titleCol, ...restCols] = columns;
  const render = (col, row) => (col.cell ? col.cell(row) : row[col.accessor]);

  return (
    <>
      {/* ---------------- Mobile: cards ---------------- */}
      <div className="md:hidden space-y-3 stagger">
        {data.map((row, i) => (
          <div
            key={row.id || i}
            style={{ '--i': i }}
            className="erp-card erp-card-interactive p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                {render(titleCol, row)}
              </div>
              {actions && <div className="shrink-0 flex gap-1.5">{actions(row)}</div>}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {restCols.map((col, ci) => (
                <div key={ci} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {t(col.header)}
                  </dt>
                  <dd className="text-xs text-gray-700 dark:text-slate-300 truncate mt-0.5">
                    {render(col, row) ?? <span className="text-gray-300">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* ---------------- Desktop: table ---------------- */}
      <div className="erp-card hidden md:block w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800 select-none">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-5 py-3 text-[10px] font-bold uppercase text-gray-400 tracking-widest whitespace-nowrap ${col.className || ''}`}
                  >
                    {t(col.header)}
                  </th>
                ))}
                {actions && (
                  <th className="px-5 py-3 text-[10px] font-bold uppercase text-gray-400 text-right tracking-widest">
                    {t('Actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60 text-sm">
              {data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  style={{ '--i': rowIndex }}
                  className="animate-fade-up hover:bg-brand-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-5 py-3.5 align-middle text-gray-700 dark:text-slate-300 ${col.className || ''}`}
                    >
                      {render(col, row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5 text-right align-middle space-x-1.5">{actions(row)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DataTable;

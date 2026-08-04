import React, { useEffect, useState } from 'react';
import { Icons } from './icons';
import { useT } from '../../context/LanguageContext';

/**
 * Reusable search + filter toolbar.
 *
 *   <SearchFilter
 *     value={query} onSearch={setQuery}
 *     chips={{ key: 'temperature', value: temp, onChange: setTemp,
 *              options: [{value:'hot',label:'Hot'}, ...] }}
 *     selects={[{ key:'status', value:status, onChange:setStatus,
 *                 placeholder:'All statuses', options:[...] }]}
 *     onClear={() => {...}}
 *     resultCount={rows.length}
 *   />
 *
 * The search box debounces (250ms) so a keystroke doesn't fire a request.
 */
const SearchFilter = ({
  value = '',
  onSearch,
  placeholder = 'Search…',
  chips,
  selects = [],
  onClear,
  resultCount,
  children,
}) => {
  const { t } = useT();
  const [local, setLocal] = useState(value);

  // Keep in sync if the parent resets the query externally.
  useEffect(() => setLocal(value), [value]);

  // Debounce outbound search.
  useEffect(() => {
    if (local === value) return undefined;
    const t = setTimeout(() => onSearch?.(local), 250);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters =
    (chips?.value ? 1 : 0) + selects.filter((s) => s.value).length + (value ? 1 : 0);

  const inputCls =
    'w-full text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ' +
    'text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 outline-none transition';

  return (
    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row gap-3 lg:items-center">
      {/* Search */}
      <div className="relative lg:max-w-xs w-full">
        <Icons.search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={t(placeholder)}
          aria-label={t(placeholder)}
          className={`${inputCls} pl-9 pr-8 py-2.5 min-h-11`}
        />
        {local && (
          <button
            onClick={() => { setLocal(''); onSearch?.(''); }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 press"
          >
            <Icons.close size={14} />
          </button>
        )}
      </div>

      {/* Filter chips (single-select segmented control) */}
      {chips && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => chips.onChange('')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition press ${
              !chips.value
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t('All')}
          </button>
          {chips.options.map((o) => (
            <button
              key={o.value}
              onClick={() => chips.onChange(o.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition press ${
                chips.value === o.value
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t(o.label)}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown filters */}
      {selects.map((s) => (
        <select
          key={s.key}
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          aria-label={t(s.placeholder)}
          className={`${inputCls} px-3 py-2.5 min-h-11 lg:w-40`}
        >
          <option value="">{t(s.placeholder)}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{t(o.label)}</option>
          ))}
        </select>
      ))}

      {children}

      {/* Result count + clear-all */}
      <div className="flex items-center gap-3 lg:ml-auto shrink-0">
        {resultCount != null && (
          <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">
            {resultCount} {resultCount === 1 ? t('result') : t('results')}
          </span>
        )}
        {activeFilters > 0 && onClear && (
          <button
            onClick={() => { setLocal(''); onClear(); }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline whitespace-nowrap press"
          >
            <Icons.filter size={12} aria-hidden="true" />
            {t('Clear')} ({activeFilters})
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;

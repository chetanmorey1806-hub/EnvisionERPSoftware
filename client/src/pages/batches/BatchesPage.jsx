import React, { useEffect, useState, useCallback } from 'react';
import { usePersistedState } from '../../hooks/useListState';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import { PageHero } from '../../components/common/PageShell';
import ExcelTools from '../../components/common/ExcelTools';
import SearchFilter from '../../components/common/SearchFilter';
import BatchesDashboard from './BatchesDashboard';
import { Icons } from '../../components/common/icons';
import { batchApi } from '../../api/batchApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

const STATUS_CLS = {
  ongoing: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  upcoming: 'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400',
  completed: 'bg-gray-100 dark:bg-slate-800 text-gray-500',
  cancelled: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400',
};

const days = (v) => {
  if (!v) return null;
  let list = v;
  if (typeof v === 'string') { try { list = JSON.parse(v); } catch { return v; } }
  return Array.isArray(list) && list.length ? list.map((d) => d.slice(0, 3)).join(' ') : null;
};

const time = (t) => (t ? String(t).slice(0, 5) : null);

/** Batch list — the New/Edit forms live on their own routes. */
const BatchesPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistedState('batches:search', '');
  const [status, setStatus] = usePersistedState('batches:status', '');
  const [error, setError] = useState('');

  // Named so it can be re-run after a bulk import, not just on mount.
  const load = useCallback(() => {
    setLoading(true);
    batchApi.getAll()
      .then((r) => setBatches(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load batches.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      header: 'Batch',
      cell: (b) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{b.name}</p>
          <p className="text-[11px] text-gray-400 font-mono">{b.code}</p>
        </div>
      ),
    },
    { header: 'Course', cell: (b) => b.course_name || <span className="text-gray-300">—</span> },
    { header: 'Trainer', cell: (b) => b.faculty_name || <span className="text-gray-300">{t('Not assigned')}</span> },
    {
      header: 'Timings',
      cell: (b) => {
        const window = time(b.start_time) && time(b.end_time)
          ? `${time(b.start_time)}–${time(b.end_time)}`
          : null;
        if (!window && !days(b.days_of_week)) {
          return <span className="text-amber-600 text-[11px] font-semibold">{t('No timings set')}</span>;
        }
        return (
          <div className="text-[11px] leading-tight">
            <p className="font-semibold">{window || t('All day')}</p>
            <p className="text-gray-400 uppercase">{days(b.days_of_week) || t('Every day')}</p>
          </div>
        );
      },
    },
    { header: 'Room', cell: (b) => b.classroom_name || <span className="text-gray-300">—</span> },
    {
      header: 'Students',
      cell: (b) => (
        <span className="text-[11px] font-semibold">
          {b.student_count}{b.capacity ? <span className="text-gray-400"> / {b.capacity}</span> : null}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (b) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CLS[b.status] || STATUS_CLS.upcoming}`}>
          {t(b.status || 'upcoming')}
        </span>
      ),
    },
  ];

  const visible = batches.filter((b) => {
    const q = search.toLowerCase();
    const matches = !q || `${b.name} ${b.code} ${b.course_name || ''} ${b.faculty_name || ''}`.toLowerCase().includes(q);
    return matches && (!status || b.status === status);
  });

  return (
    <div className="space-y-5">
      <PageHero
        tone="brand"
        icon={Icons.batches}
        title="Batches"
        subtitle="Clashes with a trainer, a room or the operating hours are rejected on save."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="batches"
              rows={batches}
              onCreate={can('batches.create') ? batchApi.create : undefined}
              onDone={load}
              variant="hero"
            />
            {can('batches.create') && (
              <Link to="/batches/new" className="erp-hero-btn px-4 py-2.5 min-h-11">
                <Icons.plus size={15} aria-hidden="true" /> {t('New Batch')}
              </Link>
            )}
          </div>
        )}
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      <BatchesDashboard />

      <SearchFilter
        value={search} onSearch={setSearch}
        placeholder="Search batch, course or trainer…"
        resultCount={visible.length}
        selects={[{
          key: 'status', value: status, onChange: setStatus, placeholder: 'All statuses',
          options: ['upcoming', 'ongoing', 'completed', 'cancelled'].map((v) => ({ value: v, label: v })),
        }]}
        onClear={() => { setSearch(''); setStatus(''); }}
      />

      <DataTable
        columns={columns}
        data={visible}
        isLoading={loading}
        actions={can('batches.update') ? (row) => (
          <button
            onClick={() => navigate(`/batches/${row.id}/edit`)}
            aria-label={`${t('Edit')} ${row.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition press"
          >
            <Icons.edit size={15} />
          </button>
        ) : undefined}
        emptyMessage="No batches yet. Create one to start scheduling classes."
      />
    </div>
  );
};

export default BatchesPage;

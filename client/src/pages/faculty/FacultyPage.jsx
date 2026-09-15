import React, { useEffect, useState, useCallback } from 'react';
import { usePersistedState } from '../../hooks/useListState';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import { PageHero } from '../../components/common/PageShell';
import ExcelTools from '../../components/common/ExcelTools';
import SearchFilter from '../../components/common/SearchFilter';
import { Icons } from '../../components/common/icons';
import { facultyApi } from '../../api/facultyApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Trainer list — the New/Edit forms live on their own routes. */
const FacultyPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistedState('trainers:search', '');
  const [status, setStatus] = usePersistedState('trainers:status', '');
  const [error, setError] = useState('');

  // Named so it can be re-run after a bulk import, not just on mount.
  const load = useCallback(() => {
    setLoading(true);
    facultyApi.getAll()
      .then((r) => setTrainers(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load trainers.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      header: 'Trainer',
      cell: (f) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{f.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{f.designation || f.employee_no || '—'}</p>
        </div>
      ),
    },
    { header: 'Department', cell: (f) => f.department || <span className="text-gray-300">—</span> },
    { header: 'Specialization', cell: (f) => f.specialization || <span className="text-gray-300">—</span> },
    {
      header: 'Experience',
      cell: (f) => (f.experience != null && f.experience !== ''
        ? <span className="text-[11px] font-semibold">{f.experience} {t('yrs')}</span>
        : <span className="text-gray-300">—</span>),
    },
    { header: 'Email', cell: (f) => f.email || <span className="text-gray-300">—</span> },
    {
      header: 'Status',
      cell: (f) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          f.status === 'inactive'
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-500'
            : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
        }`}>
          {t(f.status || 'active')}
        </span>
      ),
    },
  ];

  const visible = trainers.filter((f) => {
    const q = search.toLowerCase();
    const matches = !q || `${f.name} ${f.department || ''} ${f.specialization || ''}`.toLowerCase().includes(q);
    return matches && (!status || f.status === status);
  });

  return (
    <div className="space-y-5">
      <PageHero
        tone="brand"
        icon={Icons.faculty}
        title="Trainers"
        subtitle="Everyone who teaches. Assign them to batches from the batch form."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExcelTools
              schema="trainers"
              rows={trainers}
              onCreate={can('faculty.create') ? facultyApi.create : undefined}
              onDone={load}
              variant="hero"
            />
            {can('faculty.create') && (
              <Link to="/trainers/new" className="erp-hero-btn px-4 py-2.5 min-h-11">
                <Icons.plus size={15} aria-hidden="true" /> {t('Add Trainer')}
              </Link>
            )}
          </div>
        )}
      />

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      <SearchFilter
        value={search} onSearch={setSearch}
        placeholder="Search name, department or specialization…"
        resultCount={visible.length}
        selects={[{
          key: 'status', value: status, onChange: setStatus, placeholder: 'All statuses',
          options: [{ value: 'active', label: 'active' }, { value: 'inactive', label: 'inactive' }],
        }]}
        onClear={() => { setSearch(''); setStatus(''); }}
      />

      <DataTable
        columns={columns}
        data={visible}
        isLoading={loading}
        actions={can('faculty.update') ? (row) => (
          <button
            onClick={() => navigate(`/trainers/${row.id}/edit`)}
            aria-label={`${t('Edit')} ${row.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition press"
          >
            <Icons.edit size={15} />
          </button>
        ) : undefined}
        emptyMessage="No trainers yet. Add one, or let a trainer register on the trainer portal."
      />
    </div>
  );
};

export default FacultyPage;

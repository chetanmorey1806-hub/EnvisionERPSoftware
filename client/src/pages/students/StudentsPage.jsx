import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import SearchFilter from '../../components/common/SearchFilter';
import Breadcrumb from '../../components/common/Breadcrumb';
import StudentsDashboard from '../../components/students/StudentsDashboard';
import { Icons } from '../../components/common/icons';
import { studentApi } from '../../api/studentApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/** Drop-out risk badge — driven by the Predictive Retention engine. */
const RISK = {
  high: { label: 'High risk', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  watch: { label: 'Watch', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
};

const StudentsPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { t } = useT();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    studentApi.getAll(params)
      .then((r) => setStudents(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load students.'))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      header: 'Student',
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{r.name}</p>
          <p className="text-[11px] text-gray-400 font-mono truncate">{r.student_uid || r.admission_no || '—'}</p>
        </div>
      ),
    },
    { header: 'Course', cell: (r) => r.course_name || <span className="text-gray-300">—</span> },
    { header: 'Batch', cell: (r) => r.batch_name || <span className="text-gray-300">—</span> },
    { header: 'Email', cell: (r) => r.email || <span className="text-gray-300">—</span> },
    {
      header: 'Retention',
      cell: (r) => {
        const risk = RISK[r.risk_level];
        if (!risk) return <span className="text-[11px] text-emerald-600">OK</span>;
        return (
          <span title={r.risk_reason || ''}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${risk.cls}`}>
            <Icons.warning size={11} /> {risk.label}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (r) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('Master') }, { label: t('Students') }]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('Student Directory')}</h1>
          <p className="text-xs text-gray-500">{t('Live records — students flagged red are drop-out risks.')}</p>
        </div>
        {can('students.create') && (
          <Link to="/students/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm press">
            <Icons.plus size={15} /> {t('New Student')}
          </Link>
        )}
      </div>

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      <StudentsDashboard />

      <SearchFilter
        value={search} onSearch={setSearch} placeholder="Search name, email or admission no…"
        resultCount={students.length}
        selects={[{
          key: 'status', value: status, onChange: setStatus, placeholder: 'All statuses',
          options: ['active', 'completed', 'dropped', 'suspended', 'inactive'].map((v) => ({ value: v, label: v })),
        }]}
        onClear={() => { setSearch(''); setStatus(''); }}
      />

      <DataTable
        columns={columns}
        data={students}
        isLoading={loading}
        actions={can('students.update') ? (row) => (
          <button
            onClick={() => navigate(`/students/${row.id}/edit`)}
            aria-label={`${t('Edit')} ${row.name}`}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition press"
          >
            <Icons.edit size={15} />
          </button>
        ) : undefined}
        emptyMessage="No students yet. Admissions and imports will populate this directory."
      />
    </div>
  );
};

export default StudentsPage;

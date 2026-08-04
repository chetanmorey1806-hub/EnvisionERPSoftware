import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import Breadcrumb from '../../components/common/Breadcrumb';
import SearchFilter from '../../components/common/SearchFilter';
import { Icons } from '../../components/common/icons';
import { courseApi } from '../../api/courseApi';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

const money = (n) => (n ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

/** Course list — the New/Edit forms live on their own routes. */
const CoursesPage = () => {
  const { can } = usePermissions();
  const { t } = useT();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    courseApi.getAll()
      .then((r) => setCourses(r.data.data || []))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load courses.'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      header: 'Course',
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate">{c.title}</p>
          <p className="text-[11px] text-gray-400 font-mono">{c.code}</p>
        </div>
      ),
    },
    { header: 'Duration', cell: (c) => c.duration || <span className="text-gray-300">—</span> },
    { header: 'Fee', cell: (c) => money(c.fee) },
    { header: 'Trainer', cell: (c) => c.trainers || <span className="text-gray-300">{t('Not assigned')}</span> },
    {
      header: 'Schedule',
      cell: (c) =>
        c.starts_on ? (
          <span className="text-[11px]">{c.starts_on} → {c.ends_on || '—'}</span>
        ) : <span className="text-gray-300 text-[11px]">{t('Not scheduled')}</span>,
    },
    {
      header: 'Batches',
      cell: (c) => (
        <span className="text-[11px] font-semibold">
          {c.batch_count} · <span className="text-gray-400">{c.student_count} {t('students')}</span>
        </span>
      ),
    },
  ];

  const visible = courses.filter(
    (c) => !search || `${c.title} ${c.code}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('Master') }, { label: t('Courses') }]} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('Course Catalog')}</h1>
          <p className="text-xs text-gray-500">
            {t('Add a course with its schedule, trainer and classroom in one step.')}
          </p>
        </div>
        {can('courses.create') && (
          <Link to="/courses/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm press">
            <Icons.plus size={15} /> {t('Add New Course')}
          </Link>
        )}
      </div>

      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-600 rounded-lg text-xs">{error}</div>}

      <SearchFilter value={search} onSearch={setSearch} placeholder="Search course name or code…"
        resultCount={visible.length} onClear={() => setSearch('')} />

      <DataTable
        columns={columns}
        data={visible}
        isLoading={loading}
        actions={can('courses.update') ? (row) => (
          <button
            onClick={() => navigate(`/courses/${row.id}/edit`)}
            aria-label={`${t('Edit')} ${row.title}`}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition press"
          >
            <Icons.edit size={15} />
          </button>
        ) : undefined}
        emptyMessage="No courses yet. Click “Add New Course” to create the first one."
      />
    </div>
  );
};

export default CoursesPage;

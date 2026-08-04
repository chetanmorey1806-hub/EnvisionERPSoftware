import React from 'react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { Skeleton } from '../common/Skeleton';

const Card = ({ label, value, sub, accent = 'text-gray-800 dark:text-slate-100', loading }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h4>
    {loading ? <Skeleton className="h-7 w-20 mt-2" /> : <p className={`text-2xl font-black mt-1 ${accent}`}>{value}</p>}
    <span className="text-[11px] text-gray-400 font-medium">{sub}</span>
  </div>
);

/** Real counts from /dashboard/stats. A fresh install shows 0, never fake data. */
const StudentsDashboard = () => {
  const { stats, loading } = useDashboardStats();
  const s = stats?.students;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card loading={loading} label="Active Students" value={s?.active ?? 0} sub={`${s?.total ?? 0} enrolled in total`} />
      <Card loading={loading} label="Graduated" value={s?.graduated ?? 0} accent="text-emerald-500" sub="Completed their course" />
      <Card loading={loading} label="Active Batches" value={stats?.batches?.active ?? 0} sub={`${stats?.batches?.total ?? 0} batches total`} />
    </div>
  );
};

export default StudentsDashboard;

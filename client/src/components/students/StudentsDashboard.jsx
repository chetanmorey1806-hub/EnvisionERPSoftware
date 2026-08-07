import React from 'react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCard, StatGrid } from '../common/PageShell';
import { SkeletonCard } from '../common/Skeleton';
import { Icons } from '../common/icons';

/** Real counts from /dashboard/stats. A fresh install shows 0, never fake data. */
const StudentsDashboard = () => {
  const { stats, loading } = useDashboardStats();
  const s = stats?.students;

  if (loading) {
    return (
      <StatGrid cols={3}>
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </StatGrid>
    );
  }

  return (
    <StatGrid cols={3}>
      <StatCard
        icon={Icons.students} tone="brand"
        value={s?.active ?? 0} label="Active Students"
        sub={`${s?.total ?? 0} enrolled in total`}
      />
      <StatCard
        icon={Icons.certificates} tone="green"
        value={s?.graduated ?? 0} label="Graduated"
        sub="Completed their course"
      />
      <StatCard
        icon={Icons.batches} tone="cyan"
        value={stats?.batches?.active ?? 0} label="Active Batches"
        sub={`${stats?.batches?.total ?? 0} batches total`}
      />
    </StatGrid>
  );
};

export default StudentsDashboard;

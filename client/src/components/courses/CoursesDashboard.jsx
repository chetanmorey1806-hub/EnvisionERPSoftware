import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — this strip is not yet wired to the courses API. */
const METRICS = [
  { label: 'Listed programs', value: '42', sub: 'Across 6 departments', icon: Icons.courses, tone: 'brand' },
  { label: 'Total credits', value: '164', sub: 'Avg. 3.8 credits per course', icon: Icons.results, tone: 'violet' },
  { label: 'Departments', value: '8', sub: 'Engineering, business, core labs', icon: Icons.team, tone: 'cyan' },
];

const CoursesDashboard = () => (
  <StatGrid cols={3}>
    {METRICS.map((m) => (
      <StatCard key={m.label} icon={m.icon} tone={m.tone} value={m.value} label={m.label} sub={m.sub} />
    ))}
  </StatGrid>
);

export default CoursesDashboard;

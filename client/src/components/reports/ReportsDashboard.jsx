import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — this strip is not yet wired to a telemetry API. */
const METRICS = [
  { label: 'Compiled datasets', value: '1,420', sub: 'Financial and academic blocks', icon: Icons.reports, tone: 'green' },
  { label: 'Avg. processing time', value: '342 ms', sub: 'Query execution', icon: Icons.clock, tone: 'amber' },
  { label: 'Export pipelines', value: '2', sub: 'CSV and JSON streams', icon: Icons.download, tone: 'brand' },
];

const ReportsDashboard = () => (
  <StatGrid cols={3}>
    {METRICS.map((m) => (
      <StatCard key={m.label} icon={m.icon} tone={m.tone} value={m.value} label={m.label} sub={m.sub} />
    ))}
  </StatGrid>
);

export default ReportsDashboard;

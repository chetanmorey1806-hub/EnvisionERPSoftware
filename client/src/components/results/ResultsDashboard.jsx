import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — not yet wired to the results API. */
const ResultsDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.results} tone="violet" value="B+" label="Class average" sub="Across graded exams" />
    <StatCard icon={Icons.success} tone="green" value="96.8%" label="Pass rate" sub="Against each exam's passing mark" />
  </StatGrid>
);

export default ResultsDashboard;

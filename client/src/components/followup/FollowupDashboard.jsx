import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — not yet wired to the follow-up API. */
const FollowupDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.clock} tone="amber" value="18" label="High-priority actions" sub="Due now" />
    <StatCard icon={Icons.reports} tone="green" value="24.2%" label="Conversion yield" sub="Leads that became admissions" />
  </StatGrid>
);

export default FollowupDashboard;

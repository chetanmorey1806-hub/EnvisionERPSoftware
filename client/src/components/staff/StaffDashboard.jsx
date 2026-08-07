import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/*
 * NOTE: these figures are placeholders carried over from the original stub —
 * this strip is not yet wired to an API. Point it at the staff endpoint before
 * anyone treats the numbers as real.
 */
const StaffDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.staff} tone="brand" value="14" label="Administration desk" sub="Full-time equivalents" />
    <StatCard icon={Icons.fees} tone="green" value="6" label="Finance" sub="Full-time equivalents" />
    <StatCard icon={Icons.inventory} tone="cyan" value="8" label="Operations" sub="Full-time equivalents" />
  </StatGrid>
);

export default StaffDashboard;

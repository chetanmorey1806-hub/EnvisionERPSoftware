import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — this strip is not yet wired to a health endpoint. */
const SettingsDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.success} tone="green" value="Connected" label="Database" sub="Primary connector" />
    <StatCard icon={Icons.clock} tone="amber" value="1 hour" label="Session cache TTL" sub="Before a re-check is forced" />
  </StatGrid>
);

export default SettingsDashboard;

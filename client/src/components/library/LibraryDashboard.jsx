import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — this strip is not yet wired to the library API. */
const LibraryDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.library} tone="cyan" value="12,400" label="Catalogue volumes" sub="Titles on the shelf" />
    <StatCard icon={Icons.clock} tone="amber" value="314" label="On loan" sub="Copies currently checked out" />
  </StatGrid>
);

export default LibraryDashboard;

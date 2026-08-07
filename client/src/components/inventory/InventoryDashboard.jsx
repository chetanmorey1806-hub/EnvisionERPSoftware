import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — not yet wired to the inventory API. */
const InventoryDashboard = () => (
  <StatGrid cols={3}>
    <StatCard icon={Icons.warning} tone="rose" value="2" label="Low-stock warnings" sub="At or below reorder level" />
    <StatCard icon={Icons.inventory} tone="cyan" value="—" label="Items tracked" sub="Hardware, licences, consumables" />
  </StatGrid>
);

export default InventoryDashboard;

import React from 'react';
import { StatCard, StatGrid } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figures — this strip is not yet wired to the admissions API. */
const TILES = [
  { label: 'Pending review', value: 45, icon: Icons.clock, tone: 'amber' },
  { label: 'Documents verifying', value: 12, icon: Icons.admissions, tone: 'brand' },
  { label: 'Approved seats', value: 142, icon: Icons.success, tone: 'green' },
  { label: 'Rejected', value: 8, icon: Icons.error, tone: 'rose' },
];

const AdmissionsDashboard = () => (
  <StatGrid>
    {TILES.map((tile) => (
      <StatCard key={tile.label} icon={tile.icon} tone={tile.tone} value={tile.value} label={tile.label} />
    ))}
  </StatGrid>
);

export default AdmissionsDashboard;

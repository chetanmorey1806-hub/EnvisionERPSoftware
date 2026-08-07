import React from 'react';
import { Band } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder figure — not yet wired to the attendance API. */
const AttendanceDashboard = () => (
  <Band
    icon={Icons.attendance}
    label="Daily average roll-call"
    value="94.1%"
    note="Across all active batches"
    footnote="Healthy"
  />
);

export default AttendanceDashboard;

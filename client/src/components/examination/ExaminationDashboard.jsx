import React from 'react';
import { Band } from '../common/PageShell';
import { Icons } from '../common/icons';

/* NOTE: placeholder date — not yet wired to the exam schedule API. */
const ExaminationDashboard = () => (
  <Band
    icon={Icons.exams}
    label="Next scheduled assessment"
    value="Mid-term cycle"
    note="Starts"
    footnote="12 October 2026"
  />
);

export default ExaminationDashboard;

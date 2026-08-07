import React from 'react';
import ExaminationDashboard from '../../components/examination/ExaminationDashboard';
import { PageHero } from '../../components/common/PageShell';
import EmptyState from '../../components/common/EmptyState';
import { Icons } from '../../components/common/icons';

const ExaminationPage = () => {
  return (
    <div className="space-y-5">
      <PageHero
        tone="violet"
        icon={Icons.exams}
        title="Examinations"
        subtitle="Assessment schedule, question papers and marks entry."
      />

      <ExaminationDashboard />

      <EmptyState
        icon={Icons.exams}
        title="No examinations scheduled"
        description="Nothing is on the calendar for the current cycle. Schedule an exam and it will appear here."
      />
    </div>
  );
};

export default ExaminationPage;

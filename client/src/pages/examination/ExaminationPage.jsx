import React from 'react';
import ExaminationDashboard from '../../components/examination/ExaminationDashboard';

const ExaminationPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Academic Assessment Boards</h1>
      <ExaminationDashboard />
      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-sm">
        No active examination blocks currently deployed onto current cycle timeline coordinates.
      </div>
    </div>
  );
};

export default ExaminationPage;
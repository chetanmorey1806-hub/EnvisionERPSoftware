import React from 'react';
import ReportsDashboard from '../../components/reports/ReportsDashboard';

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analytics Reports Center Matrix</h1>
      <ReportsDashboard />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {['Q3 Financial Intake Consolidation', 'Academic Retention Index Analysis'].map((rep, idx) => (
          <div key={idx} className="p-4 bg-white dark:bg-slate-900 border rounded-xl dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm font-semibold">{rep}</span>
            <button className="text-xs font-bold text-blue-600">Download Data Payload</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
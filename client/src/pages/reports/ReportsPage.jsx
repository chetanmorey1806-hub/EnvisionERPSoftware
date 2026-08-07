import React from 'react';
import ReportsDashboard from '../../components/reports/ReportsDashboard';
import { PageHero } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';

/** Exports available from the reporting module. */
const EXPORTS = [
  { title: 'Fee collection summary', hint: 'Quarter-to-date intake, by course and payment mode' },
  { title: 'Retention analysis', hint: 'Attendance, drop-out risk and completion rates' },
];

const ReportsPage = () => {
  return (
    <div className="space-y-5">
      <PageHero
        tone="green"
        icon={Icons.reports}
        title="Institute Reports"
        subtitle="Analytics across admissions, fees, attendance and placement."
      />

      <ReportsDashboard />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map((rep) => (
          <div
            key={rep.title}
            className="erp-card erp-card-interactive p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="erp-chip erp-chip-green">
                <Icons.reports size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{rep.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{rep.hint}</p>
              </div>
            </div>
            <button className="erp-btn-soft px-3 py-2 text-[11px] shrink-0">
              <Icons.download size={14} aria-hidden="true" /> Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;

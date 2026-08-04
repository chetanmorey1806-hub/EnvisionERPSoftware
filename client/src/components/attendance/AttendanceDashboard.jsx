import React from 'react';

const AttendanceDashboard = () => (
  <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 flex justify-between items-center mb-6 text-xs">
    <div>
      <span className="text-gray-400 block">Daily Average Roll-Call Ratio</span>
      <b className="text-lg text-gray-800 dark:text-slate-100">94.1% Attendance</b>
    </div>
    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">Optimal Matrix</span>
  </div>
);

export default AttendanceDashboard;
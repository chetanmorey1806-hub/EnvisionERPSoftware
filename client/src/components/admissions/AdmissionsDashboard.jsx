import React from 'react';

const AdmissionsDashboard = () => (
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
    {['Pending Review', 'Docs Verifying', 'Approved Seats', 'Rejected Logs'].map((title, idx) => (
      <div key={idx} className="bg-white dark:bg-slate-900 p-4 border rounded-xl dark:border-slate-800">
        <span className="text-xs font-semibold text-gray-400 uppercase block">{title}</span>
        <span className="text-xl font-bold text-gray-800 dark:text-slate-100 block mt-2">{[45, 12, 142, 8][idx]}</span>
      </div>
    ))}
  </div>
);

export default AdmissionsDashboard;
import React from 'react';

const ResultsDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border dark:border-slate-800 mb-6 flex gap-8">
    <div><span className="text-xs text-gray-400 block">Class Distribution Average</span><b className="text-lg text-blue-600">Grade B+</b></div>
    <div><span className="text-xs text-gray-400 block">Passing Rate Threshold</span><b className="text-lg text-emerald-600">96.8% Success</b></div>
  </div>
);

export default ResultsDashboard;
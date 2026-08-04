import React from 'react';

const LibraryDashboard = () => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 flex justify-around mb-6 text-xs text-center">
    <div><span className="text-gray-400 block">Catalog Volume Count</span><b className="text-gray-800 dark:text-slate-200">12,400 Volumes</b></div>
    <div><span className="text-gray-400 block">Active Circulations</span><b className="text-amber-600">314 Checked Out</b></div>
  </div>
);

export default LibraryDashboard;
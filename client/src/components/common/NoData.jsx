import React from 'react';

const NoData = ({ message = 'No records match the current filters.' }) => (
  <div className="p-4 w-full text-center text-xs text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg">
    <span className="mr-1">🗂️</span> {message}
  </div>
);

export default NoData;

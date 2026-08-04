import React from 'react';

const Loader = ({ message = 'Processing request parameters...' }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
    <div className="w-16 h-16 border-4 border-gray-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4" />
    <p className="text-gray-600 dark:text-slate-400 text-sm font-semibold tracking-wide">{message}</p>
  </div>
);

export default Loader;
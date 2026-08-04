import React from 'react';

const Spinner = ({ size = 'sm', className = '' }) => {
  const dimensions = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-gray-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 ${dimensions[size]} ${className}`}
    />
  );
};

export default Spinner;

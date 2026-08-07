import React from 'react';
import { Icons } from './icons';

const NoData = ({ message = 'No records match the current filters.' }) => (
  <div className="erp-card p-5 w-full flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500">
    <Icons.empty size={15} strokeWidth={1.8} aria-hidden="true" /> {message}
  </div>
);

export default NoData;

import React from 'react';
import { Icons } from './icons';

const SearchBox = ({ value, onChange, placeholder = 'Search records...' }) => (
  <div className="relative max-w-xs w-full mb-4">
    <Icons.search
      size={15}
      aria-hidden="true"
      className="absolute inset-y-0 left-3 my-auto text-gray-400 pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xs text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
    />
  </div>
);

export default SearchBox;
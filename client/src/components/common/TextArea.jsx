import React from 'react';

const TextArea = ({ label, name, value, onChange, placeholder, rows = 4, error, className = '' }) => (
  <div className={`flex flex-col gap-1 mb-4 ${className}`}>
    {label && (
      <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400">{label}</label>
    )}
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border rounded-xl shadow-2xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
        error
          ? 'border-rose-400 focus:ring-rose-300'
          : 'border-gray-200 dark:border-slate-700 focus:ring-brand-500/30 focus:border-brand-500'
      }`}
    />
    {error && <span className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</span>}
  </div>
);

export default TextArea;
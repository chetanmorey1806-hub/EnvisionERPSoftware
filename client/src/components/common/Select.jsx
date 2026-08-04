import React from 'react';

const Select = ({ label, name, value, onChange, options, error, className = '' }) => (
  <div className={`flex flex-col gap-1 mb-4 ${className}`}>
    {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400">{label}</label>}
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`px-3 py-2.5 min-h-11 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition ${
        error ? 'border-rose-500 focus:ring-rose-400' : 'border-gray-300 dark:border-slate-700 focus:ring-blue-500/30'
      }`}
    >
      <option value="">Select Option</option>
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</span>}
  </div>
);

export default Select;
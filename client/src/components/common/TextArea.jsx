import React from 'react';

const TextArea = ({ label, name, value, onChange, placeholder, rows = 4, error, className = '' }) => (
  <div className={`flex flex-col gap-1 mb-4 ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 transition ${
        error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
      }`}
    />
    {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
  </div>
);

export default TextArea;
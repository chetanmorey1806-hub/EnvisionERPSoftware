import React from 'react';

const SearchBox = ({ value, onChange, placeholder = 'Search records...' }) => (
  <div className="relative max-w-xs w-full mb-4">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔍</span>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
    />
  </div>
);

export default SearchBox;
import React from 'react';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 mb-4 w-full ${className}`}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 flex items-center gap-0.5">
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        {iconLeft && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
            {iconLeft}
          </div>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          className={`w-full text-sm px-3.5 py-2.5 min-h-11 border rounded-lg focus:outline-none focus:ring-2
            bg-white dark:bg-slate-900 transition-all ${iconLeft ? 'pl-9' : ''} ${iconRight ? 'pr-9' : ''} ${
            disabled ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 cursor-not-allowed border-gray-200 dark:border-slate-700' : ''
          } ${
            error
              ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 text-rose-900 dark:text-rose-300 placeholder-rose-300'
              : 'border-gray-300 dark:border-slate-700 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500'
          }`}
        />

        {iconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-sm">
            {iconRight}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1 animate-fade-in">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}
    </div>
  );
};

export default Input;

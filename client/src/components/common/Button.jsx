import React from 'react';
import Spinner from './Spinner';

const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  size = 'md',
  onClick, 
  disabled = false, 
  loading = false,
  iconLeft,
  iconRight,
  className = '' 
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ' +
    'active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-sm shadow-brand-600/25 hover:shadow-md border border-transparent',
    secondary: 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 focus:ring-gray-400 border border-transparent',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-400 shadow-sm shadow-rose-500/25 hover:shadow-md border border-transparent',
    success: 'bg-verdant-500 hover:bg-verdant-600 text-white focus:ring-verdant-400 shadow-sm shadow-verdant-500/25 hover:shadow-md border border-transparent',
    outline:
      'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 ' +
      'hover:bg-gray-50 dark:hover:bg-slate-800 focus:ring-brand-500 shadow-2xs',
    ghost:
      'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 ' +
      'hover:text-gray-900 dark:hover:text-slate-100 focus:ring-gray-400',
  };

  // min-h keeps every button a >=44px tap target on touch devices (WCAG 2.5.5).
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-9',
    md: 'px-4 py-2 text-sm gap-2 min-h-11',
    lg: 'px-5 py-2.5 text-base gap-2.5 min-h-12',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner size="sm" className="text-current border-t-transparent" />}
      {!loading && iconLeft && <span className="text-base select-none">{iconLeft}</span>}
      <span>{children}</span>
      {!loading && iconRight && <span className="text-base select-none">{iconRight}</span>}
    </button>
  );
};

export default Button;
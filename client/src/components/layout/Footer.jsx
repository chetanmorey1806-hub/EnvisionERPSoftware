import React from 'react';

const Footer = () => {
  return (
    <footer className="h-12 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500 transition-colors duration-200">
      <p>&copy; 2026 Envision-ERP System Operations.</p>
      <p className="hidden sm:inline-block font-mono">v3.4.0-build.LTS</p>
    </footer>
  );
};

export default Footer;
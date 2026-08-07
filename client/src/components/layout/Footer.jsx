import React from 'react';
import { INSTITUTE } from '../common/Logo';

const Footer = () => {
  return (
    <footer className="erp-topbar h-10 px-4 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
      <p>&copy; {new Date().getFullYear()} {INSTITUTE.short} · ERP System Operations</p>
      <p className="hidden sm:inline-block font-mono">v3.4.0-build.LTS</p>
    </footer>
  );
};

export default Footer;

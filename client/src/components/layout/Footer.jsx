import React from 'react';
import { INSTITUTE } from '../common/Logo';

const Footer = () => {
  return (
    <footer className="h-9 px-4 flex items-center justify-between text-[11px] text-[var(--text-muted)] bg-[var(--surface-1)] border-t border-[var(--border)] shrink-0">
      <p>&copy; {new Date().getFullYear()} {INSTITUTE.short} · ERP System Operations</p>
      <p className="hidden sm:inline-block font-mono">v3.4.0-build.LTS</p>
    </footer>
  );
};

export default Footer;

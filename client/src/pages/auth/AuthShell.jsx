import React from 'react';
import { Link } from 'react-router-dom';
import Logo, { INSTITUTE } from '../../components/common/Logo';
import { Icons } from '../../components/common/icons';

/**
 * Shared split-screen frame for every auth page.
 * `portal` (from authRoles) themes the left brand panel; `children` is the form.
 */
const AuthShell = ({ portal, title, subtitle, children, backTo = '/login' }) => {
  const Icon = portal?.icon || Icons.roles;
  const grad = portal?.grad || 'from-slate-800 to-slate-900';

  return (
    <div className="erp-shell min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand / role panel */}
      <aside className={`hidden lg:flex flex-col justify-between p-10 relative overflow-hidden bg-linear-to-br ${grad}`}>
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-glow" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/10 blur-3xl animate-glow" style={{ animationDelay: '2.5s' }} />

        <div className="relative animate-fade-up">
          <Logo className="h-11" plate shine />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-3">
            {INSTITUTE.city} · Since {INSTITUTE.since}
          </p>
        </div>

        <div className="relative text-white animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/15 backdrop-blur mb-4">
            <Icon size={26} strokeWidth={2} />
          </div>
          <h2 className="text-3xl font-black tracking-tight">{portal?.label || 'Portal'}</h2>
          <p className="text-white/70 text-sm mt-2 max-w-sm">{portal?.tagline}</p>
        </div>

        <p className="relative text-[10px] text-white/50">
          © {INSTITUTE.since}–2026 {INSTITUTE.name}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 erp-card shadow-xl p-8 animate-scale-up">
          {/* Mobile logo (brand panel is hidden < lg) */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 shadow-sm">
              <Logo className="h-11" />
            </div>
          </div>

          <div className="text-center">
            <div className={`lg:hidden inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${portal?.soft || ''}`}>
              <Icon size={13} /> {portal?.label}
            </div>
            <h1 className="mt-4 text-xl font-black tracking-tight text-gray-900 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>}
          </div>

          {children}

          <div className="pt-2 text-center">
            <Link to={backTo} className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              <Icons.chevronDown size={12} className="rotate-90" /> Choose a different portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;

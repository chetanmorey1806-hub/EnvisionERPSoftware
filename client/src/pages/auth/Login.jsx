import React, { useState } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import ForgotPassword from '../../components/auth/ForgotPassword';
import Logo, { INSTITUTE } from '../../components/common/Logo';

const HIGHLIGHTS = [
  { icon: '💼', label: 'Lifetime job assistance' },
  { icon: '🏅', label: `${INSTITUTE.certification} company` },
  { icon: '📅', label: `Trusted since ${INSTITUTE.since}` },
];

const Login = () => {
  const [viewState, setViewState] = useState('login'); // 'login' | 'forgot_password'

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-white dark:bg-slate-950">
      {/* ------------------------------------------------ Brand / hero panel */}
      {/* Hidden below lg so the form stays above the fold on phones. */}
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-sky-50 dark:bg-sky-950/30 relative overflow-hidden">
        {/* soft decorative washes — slow breathing glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-300/40 dark:bg-brand-500/10 blur-3xl pointer-events-none animate-glow" />
        <div
          className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-sky-300/30 dark:bg-sky-500/10 blur-3xl pointer-events-none animate-glow"
          style={{ animationDelay: '2.5s' }}
        />

        <div className="relative animate-fade-up" style={{ animationDelay: '80ms' }}>
          <Logo className="h-12" plate shine />
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-900/50 dark:text-brand-300/60 mt-3">
            {INSTITUTE.city} · India
          </p>
        </div>

        <div className="relative flex-1 flex items-center justify-center py-6">
          <img
            src="/about-us.png"
            alt="A student holding a sign that reads: Lifetime Job Assistance Courses"
            width={515}
            height={476}
            fetchPriority="high"
            className="w-full max-w-md h-auto object-contain drop-shadow-xl animate-float"
          />
        </div>

        <ul className="relative flex flex-wrap gap-x-6 gap-y-2 stagger">
          {HIGHLIGHTS.map((h, i) => (
            <li
              key={h.label}
              style={{ '--i': i + 6 }}
              className="flex items-center gap-2 text-[11px] font-semibold text-brand-900/70 dark:text-brand-200/70"
            >
              <span aria-hidden="true">{h.icon}</span>
              {h.label}
            </li>
          ))}
        </ul>
      </aside>

      {/* ------------------------------------------------------- Form panel */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-linear-to-br from-slate-900 via-brand-950 to-slate-900 lg:bg-none lg:bg-white dark:lg:bg-slate-950">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-2xl lg:shadow-none border border-slate-100 dark:border-slate-900 lg:border-0 animate-scale-up stagger">
          <div className="text-center" style={{ '--i': 1 }}>
            {/* Logo repeats here only on small screens, where the hero panel is hidden. */}
            <div className="lg:hidden inline-block">
              <Logo className="h-12" plate shine />
            </div>

            <p className="lg:hidden text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mt-3">
              {INSTITUTE.city} · An {INSTITUTE.certification} Company
            </p>

            <h2 className="mt-6 lg:mt-0 text-xl font-black tracking-tight text-gray-900 dark:text-slate-100">
              {viewState === 'login' ? 'Welcome back' : 'Reset your password'}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {viewState === 'login'
                ? 'Sign in to continue to your dashboard.'
                : "We'll email you a link to set a new password."}
            </p>
          </div>

          <div style={{ '--i': 2 }}>
            {viewState === 'login' ? (
              <LoginForm onForgotPasswordClick={() => setViewState('forgot_password')} />
            ) : (
              <ForgotPassword onBackToLogin={() => setViewState('login')} />
            )}
          </div>

          <p className="text-center text-[10px] text-gray-400 dark:text-slate-600" style={{ '--i': 3 }}>
            © {INSTITUTE.since}–2026 {INSTITUTE.name}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;

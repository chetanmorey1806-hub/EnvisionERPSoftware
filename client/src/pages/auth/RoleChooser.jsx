import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo, { INSTITUTE } from '../../components/common/Logo';
import { Icons } from '../../components/common/icons';
import { AUTH_ROLES, ROLE_ORDER } from '../../config/authRoles';

/**
 * The front door. Each role gets its own login/register path, so a Trainer,
 * a Placement Officer and a Student never share a screen.
 * `mode` = 'login' | 'register'.
 *
 * It sits on the same washed photographic backdrop as the workspace, so
 * signing in and being signed in look like one product.
 */
const RoleChooser = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  return (
    <div className="erp-shell min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl animate-fade-up">

        <div className="text-center lg:text-left mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-lg">
            <Logo className="h-12" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mt-3">
            {INSTITUTE.city} · {INSTITUTE.certification}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/*
            The institute's own promise, stated once on the way in. The artwork
            carries its headline baked into the pixels, so it is placed as a
            message — never blurred behind data, where those words would read as
            an accident.
          */}
          <div className="hidden lg:block">
            <img
              src="/about-us.png"
              alt="Lifetime job assistance courses at Envision Computer Training Institute"
              width={515}
              height={476}
              className="w-full max-w-md mx-auto select-none drop-shadow-sm"
              draggable="false"
            />
            <ul className="mt-6 space-y-2.5 max-w-md mx-auto">
              {[
                'Lifetime placement assistance till you get a job',
                'Trainers with real project experience',
                'Industry-aligned, job-ready curriculum',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-400">
                  <Icons.success size={16} className="shrink-0 mt-0.5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-center lg:text-left mb-6">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-50">
                {isRegister ? 'Create your account' : 'Sign in to your portal'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Choose your role to continue.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {ROLE_ORDER.map((slug, i) => {
            const p = AUTH_ROLES[slug];
            const Icon = p.icon;
            const to = isRegister ? `/register/${slug}` : `/login/${slug}`;
            const disabled = isRegister && !p.canRegister;

            const Card = disabled ? 'div' : Link;
            return (
              <Card
                key={slug}
                {...(disabled ? {} : { to })}
                style={{ '--i': i }}
                className={`group erp-card p-5 text-left ${
                  disabled ? 'opacity-60 cursor-not-allowed' : 'erp-card-interactive'
                }`}
              >
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-linear-to-br ${p.grad} text-white shadow-md`}>
                  <Icon size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-slate-100">{p.label}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{p.tagline}</p>

                {disabled ? (
                  <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
                    Provisioned by the administrator — cannot self-register.
                  </p>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
                    {isRegister ? 'Register' : 'Login'}
                    <Icons.chevronDown size={13} className="-rotate-90 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Card>
            );
              })}
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate(isRegister ? '/login' : '/register')}
            className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleChooser;

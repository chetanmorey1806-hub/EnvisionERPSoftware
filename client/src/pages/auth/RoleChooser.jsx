import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo, { INSTITUTE } from '../../components/common/Logo';
import { Icons } from '../../components/common/icons';
import { AUTH_ROLES, ROLE_ORDER } from '../../config/authRoles';

/**
 * The front door. Each role gets its own login/register path, so a Trainer,
 * a Placement Officer and a Student never share a screen.
 * `mode` = 'login' | 'register'.
 */
const RoleChooser = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-3xl animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-lg">
            <Logo className="h-12" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-3">
            {INSTITUTE.city} · An ISO 9001:2015 Certified Company
          </p>
          <h1 className="mt-5 text-2xl font-black text-white">
            {isRegister ? 'Create your account' : 'Sign in to your portal'}
          </h1>
          <p className="text-sm text-white/60 mt-1">Choose your role to continue.</p>
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
                className={`group relative p-5 rounded-2xl border text-left transition-all ${
                  disabled
                    ? 'border-white/10 bg-white/5 opacity-60 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover-lift'
                }`}
              >
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${p.grad} text-white shadow-lg`}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">{p.label}</h3>
                <p className="text-xs text-white/50 mt-0.5">{p.tagline}</p>

                {disabled ? (
                  <p className="mt-3 text-[11px] text-amber-300/80">Provisioned by the administrator — cannot self-register.</p>
                ) : (
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white">
                    {isRegister ? 'Register' : 'Login'} <Icons.chevronDown size={13} className="-rotate-90" />
                  </span>
                )}
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate(isRegister ? '/login' : '/register')}
            className="text-xs text-white/60 hover:text-white"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleChooser;

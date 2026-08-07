import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { PageHero, Panel } from '../../components/common/PageShell';
import { Icons } from '../../components/common/icons';

/** One read-only attribute of the signed-in account. */
const Detail = ({ label, children }) => (
  <div className="py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
      {label}
    </p>
    <div className="mt-1 text-sm text-gray-800 dark:text-slate-100">{children}</div>
  </div>
);

const ProfilePage = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHero
        tone="slate"
        icon={Icons.staff}
        title="My Profile"
        subtitle="The account you are signed in with."
      />

      <Panel title="Account" icon={Icons.staff} tone="brand">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="h-16 w-16 rounded-2xl bg-brand-600 grid place-items-center text-2xl font-black text-white uppercase shadow-md shadow-brand-600/25">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-gray-900 dark:text-slate-50 truncate">
              {user?.name || 'Account holder'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{user?.role || 'user'}</p>
          </div>
        </div>

        <div className="mt-2">
          <Detail label="Full name">{user?.name || '—'}</Detail>
          <Detail label="Email">{user?.email || '—'}</Detail>
          <Detail label="Role">
            <span className="status-pill bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-900/60 capitalize">
              {user?.role || 'user'}
            </span>
          </Detail>
        </div>
      </Panel>
    </div>
  );
};

export default ProfilePage;

import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Icons } from '../common/icons';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 focus:outline-none press"
      >
        <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center font-bold text-sm shadow-sm shadow-brand-600/25">
          {user?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
      </button>

      {isOpen && (
        <>
          {/* Click-away catcher — the menu should not need a second click to shut. */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-56 erp-card shadow-xl z-50 py-1 overflow-hidden animate-scale-up origin-top-right">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
                {user?.name || 'User Profile'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate capitalize">{user?.role}</p>
            </div>

            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icons.staff size={15} className="text-gray-400" aria-hidden="true" /> My Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icons.settings size={15} className="text-gray-400" aria-hidden="true" /> Settings
            </Link>
            <button
              onClick={logout}
              className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-t border-gray-100 dark:border-slate-800 transition-colors"
            >
              <Icons.logout size={15} aria-hidden="true" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileMenu;

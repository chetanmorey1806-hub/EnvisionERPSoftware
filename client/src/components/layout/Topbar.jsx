import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { AuthContext } from '../../context/AuthContext';
import { Icons } from '../common/icons';
import PageHelp from '../common/PageHelp';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';
import ChatWidget from '../chat/ChatWidget';

/**
 * Turns `/students/42/edit` into "Students / 42 / Edit" — a readable trail
 * derived from the URL, so a newly registered route gets a breadcrumb without
 * anyone having to declare one.
 */
const humanise = (segment) => segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Topbar = () => {
  const { toggleSidebar } = useContext(SidebarContext);
  const { user, logout } = useContext(AuthContext);
  const { pathname } = useLocation();

  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="erp-topbar min-h-14 flex items-center justify-between gap-2 px-2.5 sm:px-4 py-2 shrink-0 z-30">

      {/* Left: navigation toggle + route trail */}
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={toggleSidebar} aria-label="Toggle navigation" className="erp-icon-btn shrink-0">
          <Icons.menu size={18} aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium min-w-0">
          <Link
            to="/dashboard"
            className="text-gray-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shrink-0"
          >
            Admin
          </Link>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              <span className="text-gray-300 dark:text-slate-700 shrink-0" aria-hidden="true">/</span>
              <span
                className={`truncate ${
                  i === segments.length - 1
                    ? 'text-gray-800 dark:text-slate-100 font-semibold'
                    : 'text-gray-400 dark:text-slate-500'
                }`}
              >
                {humanise(seg)}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: session state + controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="erp-online hidden lg:inline-flex">Online</span>

        <span className="hidden xl:inline text-xs font-semibold text-gray-600 dark:text-slate-300 px-1">
          Welcome, {user?.name?.split(' ')[0] || 'User'}
        </span>

        {/* Rendered once, here — so EVERY route keeps its "how to use" guide. */}
        <div className="hidden sm:block">
          <PageHelp />
        </div>

        <LanguageSwitcher />
        <ThemeSwitcher />

        {/* Renders nothing for accounts without chat.view (e.g. students). */}
        <ChatWidget />

        <NotificationMenu />

        <Link to="/settings" aria-label="Settings" title="Settings" className="erp-icon-btn hidden md:grid">
          <Icons.settings size={17} aria-hidden="true" />
        </Link>

        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="erp-icon-btn hidden sm:grid hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Icons.logout size={17} aria-hidden="true" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

        <ProfileMenu />
      </div>
    </header>
  );
};

export default Topbar;

import React, { useContext } from 'react';
import { SidebarContext } from '../../context/SidebarContext';
import ThemeSwitcher from './ThemeSwitcher';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';
import LanguageSwitcher from './LanguageSwitcher';
import ChatWidget from '../chat/ChatWidget';

const Navbar = () => {
  const { isOpen, toggleSidebar } = useContext(SidebarContext);

  return (
    <nav className="sticky top-0 z-30 h-16 w-full flex items-center justify-between gap-3 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-xs transition-colors duration-200 animate-fade-in">
      {/* Left cluster: animated menu toggle + node status */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
          className="grid place-items-center h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all duration-150"
        >
          {/* Three bars that morph into an X based on sidebar state */}
          <span className="relative block w-5 h-4" aria-hidden="true">
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                isOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                isOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${
                isOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-0'
              }`}
            />
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          {/* Live status indicator with pinging halo */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-black tracking-tight text-brand-600 dark:text-brand-400 truncate">
            Envision
            <span className="hidden lg:inline font-semibold text-gray-400 dark:text-slate-500">
              {' '}Computer Training Institute
            </span>
            <span className="font-semibold text-gray-400 dark:text-slate-500"> · Pune</span>
          </span>
        </div>
      </div>

      {/* Right cluster: action controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="transition-transform duration-150 hover:-translate-y-0.5">
          <LanguageSwitcher />
        </div>
        <div className="transition-transform duration-150 hover:-translate-y-0.5">
          <ThemeSwitcher />
        </div>
        <div className="transition-transform duration-150 hover:-translate-y-0.5">
          {/* Renders nothing for accounts without chat.view (e.g. students). */}
          <ChatWidget />
        </div>
        <div className="transition-transform duration-150 hover:-translate-y-0.5">
          <NotificationMenu />
        </div>
        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-800" />
        <ProfileMenu />
      </div>
    </nav>
  );
};

export default Navbar;

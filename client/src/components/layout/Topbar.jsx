import React, { useContext } from 'react';
import { SidebarContext } from '../../context/SidebarContext';
import ThemeSwitcher from './ThemeSwitcher';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';

const Topbar = () => {
  const { toggleSidebar } = useContext(SidebarContext);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 text-lg"
        >
          ☰
        </button>
        <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline-block">
          Enterprise Node Active
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <NotificationMenu />
        <div className="w-px h-6 bg-gray-200 dark:bg-slate-800 mx-1" />
        <ProfileMenu />
      </div>
    </header>
  );
};

export default Topbar;
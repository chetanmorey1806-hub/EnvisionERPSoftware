import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import TopNav from './TopNav';
import MobileMenuDrawer from './MobileMenuDrawer';
import MobileBottomNav from './MobileBottomNav';
import PageHelp from '../common/PageHelp';

/**
 * Top-nav shell: a sticky header (brand/actions bar + grouped horizontal menu)
 * over a full-width content area — no left sidebar. Below `lg` the menu becomes
 * a drawer, with the most-used destinations also on a bottom bar.
 */
const MainLayout = () => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 shrink-0">
        <Navbar />
        <TopNav />
      </header>

      {/* Mobile grouped menu */}
      <MobileMenuDrawer />

      {/* Content */}
      <main className="flex-1 w-full">
        {/* `key` restarts the page transition on every route change */}
        <div key={pathname} className="animate-fade-up max-w-(--breakpoint-2xl) mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {/* Rendered here, once — so EVERY page gets the help button. */}
          <div className="flex justify-end mb-3">
            <PageHelp />
          </div>
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;

import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import { SidebarContext } from '../../context/SidebarContext';

/**
 * The workspace shell.
 *
 * Sidebar, topbar and footer float as rounded panels over a washed-out
 * photographic backdrop (`.erp-shell`) with a gutter between them, rather than
 * butting together as flat regions — that separation is what gives the product
 * its depth. The backdrop is decorative only; every readable surface sits on an
 * opaque card above it.
 *
 * Below `md` the sidebar leaves the flow entirely and becomes a slide-over
 * drawer, with the most-used destinations also on a thumb-reachable bottom bar.
 */
const MainLayout = () => {
  const { pathname } = useLocation();
  const { isOpen, closeSidebar } = useContext(SidebarContext);

  return (
    <div className="erp-shell flex h-screen overflow-hidden font-sans antialiased text-gray-900 dark:text-slate-50 p-2 sm:p-3 gap-0 md:gap-3">

      {/* ---------- Desktop: docked navigation panel ---------- */}
      <div
        className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64' : 'w-18'
        }`}
      >
        <Sidebar />
      </div>

      {/* ---------- Mobile: slide-over drawer ---------- */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
            onClick={closeSidebar}
          />
          <div className="relative w-64 max-w-[80vw] m-2 animate-slide-in">
            <Sidebar onNavigate={closeSidebar} />
          </div>
        </div>
      )}

      {/* ---------- Content stack ---------- */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden gap-2 sm:gap-3">
        <Topbar />

        <main className="flex-1 overflow-x-hidden overflow-y-auto focus:outline-none">
          {/* `key` restarts the page transition on every route change */}
          <div key={pathname} className="max-w-7xl mx-auto w-full animate-fade-up pb-24 md:pb-4 px-0.5">
            <Outlet />
          </div>
        </main>

        <div className="hidden md:block">
          <Footer />
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;

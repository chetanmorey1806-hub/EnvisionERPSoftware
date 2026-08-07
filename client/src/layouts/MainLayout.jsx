import React, { useContext } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import Footer from '../components/layout/Footer';
import { SidebarContext } from '../context/SidebarContext';

/**
 * The workspace shell.
 *
 * Sidebar and topbar float as rounded panels over a washed-out photographic
 * backdrop (`.erp-shell`) rather than butting against each other as flat
 * regions — that gutter is what gives the product its depth. The backdrop
 * itself is decorative only; every readable surface sits on an opaque card.
 */
const MainLayout = ({ children }) => {
  const { isOpen } = useContext(SidebarContext);

  return (
    <div className="erp-shell flex h-screen overflow-hidden font-sans antialiased text-gray-900 dark:text-slate-50 p-2 sm:p-3 gap-2 sm:gap-3">

      {/* 1. Collapsible Structural Navigation Menu */}
      <div
        className={`transform transition-all duration-300 ease-in-out shrink-0 ${
          isOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        }`}
      >
        <Sidebar />
      </div>

      {/* 2. Core Operational Content Stack */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden gap-2 sm:gap-3">

        {/* Global Structural Top Banner Controls */}
        <Topbar />

        {/* 3. Main Viewport Scroll Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto focus:outline-none pr-0.5">
          <div className="max-w-7xl mx-auto w-full animate-fade-in pb-4">
            {children}
          </div>
        </main>

        {/* Sticky Base Reporting Banner */}
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;

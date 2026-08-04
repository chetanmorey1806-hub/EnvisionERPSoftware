import React, { useContext } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import Footer from '../components/layout/Footer';
import { SidebarContext } from '../context/SidebarContext';
import { ThemeContext } from '../context/ThemeContext';

const MainLayout = ({ children }) => {
  // Pull layout management toggle and theme state from custom app contexts
  const { isOpen } = useContext(SidebarContext);
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`flex h-screen overflow-hidden font-sans antialiased ${theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* 1. Collapsible Structural Navigation Menu */}
      <div className={`transform transition-all duration-300 ease-in-out flex-shrink-0 ${isOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <Sidebar />
      </div>

      {/* 2. Core Operational Content Stack */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        {/* Global Structural Top Banner Controls */}
        <Topbar />
        
        {/* 3. Main Viewport Scroll Container */}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto focus:outline-none p-4 md:p-6 lg:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
          <div className="max-w-7xl mx-auto w-full animate-fade-in">
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
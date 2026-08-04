import React, { useContext } from 'react';
import { SidebarContext } from '../../context/SidebarContext';
import Sidebar from './Sidebar';

const MobileSidebar = () => {
  const { isOpen, closeSidebar } = useContext(SidebarContext);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Background Mask */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={closeSidebar} />
      
      {/* Drawer Canvas */}
      <div className="relative flex flex-col w-full max-w-xs bg-slate-900 animate-slide-in">
        <Sidebar />
      </div>
    </div>
  );
};

export default MobileSidebar;
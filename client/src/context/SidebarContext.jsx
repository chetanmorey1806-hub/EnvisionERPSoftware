import React, { createContext, useState } from 'react';

export const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  // Start expanded on desktop, but closed on mobile so the slide-over drawer
  // doesn't cover the screen on first load.
  const [isOpen, setIsOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  );

  const toggleSidebar = () => setIsOpen(prev => !prev);
  const closeSidebar = () => setIsOpen(false);
  const openSidebar = () => setIsOpen(true);

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
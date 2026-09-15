import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import AppTopNav from './AppTopNav';
import Switcher from './Switcher';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import CommandPalette from '../common/CommandPalette';
import { SidebarContext } from '../../context/SidebarContext';

/**
 * The workspace shell — bk-steels' structure.
 *
 *   .app-shell            the whole page
 *     .sidemenu           fixed, desktop only, only when nav = vertical
 *     .app-frame          padded clear of the side menu by the layout CSS
 *       .app-header       full-bleed gradient, sticky when headerPos = fixed
 *       .topnav           horizontal bar, only when nav = horizontal
 *       .app-main         the page, measured to --app-max
 *
 * The document scrolls, not an inner pane — that is what lets the header and
 * menu bar be `position: sticky`, which the Header/Menu Position options need.
 * Below `lg` the side menu is a slide-over drawer whatever the preference is.
 */
const MainLayout = () => {
  const { pathname } = useLocation();
  const { isOpen, closeSidebar } = useContext(SidebarContext);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  /*
    Publish the header's measured height as `--header-h`. With both Header and
    Menu Positions set to Fixed, the menu bar sticks to `top: var(--header-h)`
    so it lands under the header rather than behind it — and the header's height
    changes with the viewport, so a hard-coded number drifts.
  */
  useEffect(() => {
    const el = document.querySelector('.app-header');
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const publish = () => document.documentElement.style
      .setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
    Restore where you were on a screen you have already visited. The window is
    the scroller now, so this is plain scrollY — but the browser's own
    restoration still cannot help, because the rows arrive after the route does.
  */
  useEffect(() => {
    const key = `erp-scroll:${pathname}`;
    const saved = Number(sessionStorage.getItem(key) || 0);
    if (saved) {
      // Two frames: the first runs before the rows have height.
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, saved)));
    } else {
      window.scrollTo(0, 0);
    }
    return () => {
      try { sessionStorage.setItem(key, String(window.scrollY)); } catch { /* ignore */ }
    };
  }, [pathname]);

  /*
    Settings → Appearance → "Open the Switcher" is not next to the gear, so it
    asks for the panel by event rather than by prop-drilling a setter through
    the router into a page.
  */
  useEffect(() => {
    const open = () => setSwitcherOpen(true);
    window.addEventListener('erp:open-switcher', open);
    return () => window.removeEventListener('erp:open-switcher', open);
  }, []);

  return (
    <div className="app-page app-shell min-h-screen">

      {/* Desktop side menu — shown by the layout CSS only when nav = vertical */}
      <Sidebar />

      {/* Mobile / tablet drawer — available whatever the navigation style */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[1200] flex">
          <div className="fixed inset-0 bg-[rgb(15_18_24/0.45)]" onClick={closeSidebar} />
          <div className="relative w-64 max-w-[80vw] h-full shadow-[var(--shadow-pop)] animate-slide-in">
            <Sidebar mobile onNavigate={closeSidebar} />
          </div>
        </div>
      )}

      <div className="app-frame flex min-h-screen flex-col">
        <AppHeader onOpenSwitcher={() => setSwitcherOpen(true)} />

        <div className="hidden lg:block">
          <AppTopNav />
        </div>

        <main className="flex-1">
          {/* `key` restarts the page transition on every route change */}
          <div key={pathname} className="app-main w-full animate-fade-up p-3 xl:p-4 pb-24 lg:pb-4">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>

      <MobileBottomNav />

      {/* Mounted once — listens for ⌘K anywhere in the app. */}
      <CommandPalette />
      <Switcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
};

export default MainLayout;

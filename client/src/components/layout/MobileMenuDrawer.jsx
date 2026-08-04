import React, { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { usePermissions } from '../../hooks/usePermissions';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';
import Logo from '../common/Logo';
import { Icons } from '../common/icons';
import { useT } from '../../context/LanguageContext';

/**
 * Mobile menu (< lg): the same grouped sections as the desktop top-nav, but as
 * an accordion drawer. The group containing the current route starts expanded.
 */
const MobileMenuDrawer = () => {
  const { isOpen, closeSidebar } = useContext(SidebarContext);
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { t } = useT();

  const sections = visibleSections(can);
  const links = visibleTopLinks(can);
  const currentKey = sections.find((s) => s.items.some((i) => pathname.startsWith(i.path)))?.key;
  const [expanded, setExpanded] = useState(currentKey || sections[0]?.key);

  if (!isOpen) return null;

  const isActive = (p) => pathname === p || pathname.startsWith(`${p}/`);

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={closeSidebar} />

      <aside className="relative flex flex-col w-full max-w-xs bg-white dark:bg-slate-900 animate-slide-in shadow-2xl">
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 shrink-0">
          <Logo className="h-8" />
          <button onClick={closeSidebar} aria-label="Close menu"
            className="h-9 w-9 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 press">
            <Icons.close size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((l) => {
            const LinkIcon = l.icon;
            return (
              <NavLink key={l.path} to={l.path} onClick={closeSidebar}
                className={`flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm font-semibold ${
                  isActive(l.path)
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <LinkIcon size={17} /> {t(l.name)}
              </NavLink>
            );
          })}

          {sections.map((s) => {
            const open = expanded === s.key;
            return (
              <div key={s.key}>
                <button
                  onClick={() => setExpanded(open ? null : s.key)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-3 py-2.5 min-h-11 rounded-lg text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  {t(s.label)}
                  <Icons.chevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="mt-0.5 ml-2 pl-2 border-l border-gray-100 dark:border-slate-800 space-y-0.5">
                    {s.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <NavLink key={item.path} to={item.path} onClick={closeSidebar}
                          className={`flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm ${
                            isActive(item.path)
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                          <ItemIcon size={16} className="shrink-0" />
                          <span className="truncate">{t(item.name)}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};

export default MobileMenuDrawer;

import React, { useContext, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { usePermissions } from '../../hooks/usePermissions';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';
import { useT } from '../../context/LanguageContext';
import Logo, { INSTITUTE } from '../common/Logo';
import { Icons } from '../common/icons';

/**
 * Primary navigation — a floating white panel of collapsible sections.
 *
 * It reads the same registry that generates the routes (`menuSections`), so a
 * new module appears here the moment it is registered, already filtered against
 * the permissions the API returned for the signed-in user.
 */

/** Resting icon colour per section tone. Spelled out so Tailwind keeps them. */
const TONE_TEXT = {
  brand: 'text-brand-600 dark:text-brand-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-500 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  rose: 'text-rose-500 dark:text-rose-400',
  slate: 'text-gray-500 dark:text-slate-400',
};

/**
 * `onNavigate` fires after a destination is picked. The mobile drawer passes
 * `closeSidebar` so the overlay gets out of the way; the docked desktop panel
 * passes nothing, because collapsing the menu on every click would be hostile.
 */
const Sidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const { isOpen } = useContext(SidebarContext);
  const { can } = usePermissions();
  const { t } = useT();

  const sections = visibleSections(can);
  const links = visibleTopLinks(can);

  /*
    Sections collapse. `collapsed` records only the ones deliberately shut, and
    a section holding the current route is forced open regardless — the user
    should never be on a page whose menu entry is hidden.
  */
  const [collapsed, setCollapsed] = useState({});
  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const isActive = (p) => pathname === p || pathname.startsWith(`${p}/`);

  /** One row. Used for both the flat links and the section children. */
  const NavItem = ({ item, tone = 'slate' }) => {
    const active = isActive(item.path);
    return (
      <NavLink
        to={item.path}
        title={t(item.name)}
        onClick={onNavigate}
        className={`erp-nav-link ${active ? 'erp-nav-link-active' : ''} ${isOpen ? '' : 'justify-center px-0'}`}
      >
        <item.icon
          size={18}
          strokeWidth={2}
          className={`shrink-0 ${active ? 'text-white' : TONE_TEXT[tone]}`}
          aria-hidden="true"
        />
        <span
          className={`truncate transition-all duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden pointer-events-none'
          }`}
        >
          {t(item.name)}
        </span>
      </NavLink>
    );
  };

  return (
    <aside className="erp-sidebar h-full w-full">

      {/* Brand plate */}
      <div className="px-3 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        {isOpen ? (
          <Link to="/dashboard" title={INSTITUTE.name} className="flex flex-col items-center gap-1 animate-fade-in">
            <Logo className="h-11" shine />
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-slate-500 whitespace-nowrap">
              {INSTITUTE.city} · Since {INSTITUTE.since}
            </p>
          </Link>
        ) : (
          <Link
            to="/dashboard"
            title={INSTITUTE.name}
            className="mx-auto h-10 w-10 grid place-items-center rounded-xl bg-brand-600 text-white font-black text-sm shadow-md shadow-brand-600/25"
          >
            E
          </Link>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-0.5" aria-label="Main">
        {/* Flat, one-click destinations */}
        {links.map((l) => (
          <NavItem key={l.path} item={l} tone="brand" />
        ))}

        {sections.map((s) => {
          const holdsActive = s.items.some((i) => isActive(i.path));
          const shut = (collapsed[s.key] ?? false) && !holdsActive;

          return (
            <div key={s.key} className="space-y-0.5">
              {isOpen ? (
                <button
                  type="button"
                  onClick={() => toggleSection(s.key)}
                  aria-expanded={!shut}
                  className="w-full flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                >
                  <span className="truncate">{t(s.label)}</span>
                  <Icons.chevronDown
                    size={13}
                    className={`shrink-0 transition-transform duration-200 ${shut ? '-rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                /* Collapsed rail: a hairline stands in for the section heading. */
                <div className="mx-3 my-2 border-t border-gray-100 dark:border-slate-800" />
              )}

              {(!isOpen || !shut) && s.items.map((item) => (
                <NavItem key={item.path} item={item} tone={s.tone} />
              ))}
            </div>
          );
        })}

        {/* Account */}
        <div className="pt-3.5">
          {isOpen && (
            <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
              {t('Account')}
            </p>
          )}
          <NavItem item={{ name: 'Profile', path: '/profile', icon: Icons.staff }} tone="slate" />
        </div>
      </nav>

      {/* Ownership line */}
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <p className="text-[10px] text-center font-medium text-gray-400 dark:text-slate-600">
            {new Date().getFullYear()} {INSTITUTE.short}
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

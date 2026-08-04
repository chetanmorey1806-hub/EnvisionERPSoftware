import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icons } from '../common/icons';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * Horizontal grouped menu (desktop only, >= lg).
 * Each section opens a dropdown panel; panels with many items go two-column.
 * Items are permission-filtered, so a Trainer and a Counselor see different
 * groups — and empty groups disappear entirely.
 */
const TopNav = () => {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { t } = useT();
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  const sections = visibleSections(can);
  const links = visibleTopLinks(can);

  // Close on outside click / route change / Escape.
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => setOpen(null), [pathname]);

  const isItemActive = (path) => pathname === path || pathname.startsWith(`${path}/`);
  const isSectionActive = (s) => s.items.some((i) => isItemActive(i.path));

  if (sections.length === 0 && links.length === 0) return null;

  return (
    <nav
      ref={ref}
      aria-label="Main"
      className="hidden lg:block bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800"
    >
      <ul className="flex items-center gap-0.5 px-4 h-11">
        {/* Flat top-level links (Dashboard, Document Vault) — not groups */}
        {links.map((l) => {
          const LinkIcon = l.icon;
          return (
            <li key={l.path}>
              <NavLink
                to={l.path}
                className={`inline-flex items-center gap-1.5 h-11 px-3 text-xs font-bold border-b-2 transition-colors ${
                  isItemActive(l.path)
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-500 dark:text-slate-400 border-transparent hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                <LinkIcon size={15} /> {t(l.name)}
              </NavLink>
            </li>
          );
        })}

        {sections.map((s) => {
          const active = isSectionActive(s);
          const isOpen = open === s.key;
          const twoCol = s.items.length > 6;

          return (
            <li key={s.key} className="relative">
              <button
                onClick={() => setOpen(isOpen ? null : s.key)}
                aria-expanded={isOpen}
                className={`inline-flex items-center gap-1 h-11 px-3 text-xs font-bold border-b-2 transition-colors ${
                  active || isOpen
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-500 dark:text-slate-400 border-transparent hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                {t(s.label)}
                <Icons.chevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div
                  className={`absolute left-0 top-full mt-1 z-50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800
                    bg-white dark:bg-slate-900 shadow-xl animate-scale-up origin-top-left grid gap-0.5
                    ${twoCol ? 'grid-cols-2 w-[26rem]' : 'grid-cols-1 w-56'}`}
                >
                  {s.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive = isItemActive(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors border-l-2 ${
                          itemActive
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-600 font-semibold'
                            : 'text-gray-600 dark:text-slate-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ItemIcon size={15} className="shrink-0" />
                        <span className="truncate">{t(item.name)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TopNav;

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icons } from '../common/icons';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * The horizontal menu bar — bk-steels' `.topnav`.
 *
 * Sections open a dropdown panel; a panel with more than six entries goes two
 * columns. A panel opened near the right-hand end of the bar is flipped to hang
 * off its own right edge, measured after it renders rather than guessed from
 * the item's index — the bar wraps, so index tells you nothing about position.
 */
const AppTopNav = () => {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { t } = useT();
  const [open, setOpen] = useState(null);
  const [flip, setFlip] = useState(false);
  const barRef = useRef(null);
  const panelRef = useRef(null);

  const sections = visibleSections(can);
  const links = visibleTopLinks(can);

  // Close on outside click, Escape, or a route change.
  useEffect(() => {
    const onClick = (e) => { if (barRef.current && !barRef.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => { setOpen(null); }, [pathname]);

  // Measure once the panel exists; flip it if it would run off the viewport.
  useEffect(() => {
    if (!open || !panelRef.current) { setFlip(false); return; }
    const r = panelRef.current.getBoundingClientRect();
    setFlip(r.right > window.innerWidth - 12);
  }, [open]);

  const isActive = (p) => pathname === p || pathname.startsWith(`${p}/`);

  if (sections.length === 0 && links.length === 0) return null;

  return (
    <nav className="topnav" aria-label="Main" ref={barRef}>
      <div className="topnav-inner">
        {links.map((l) => {
          const LinkIcon = l.icon;
          return (
            <div className="nav-group" key={l.path}>
              <NavLink to={l.path} className={`nav-link ${isActive(l.path) ? 'active' : ''}`}>
                <LinkIcon size={16} className="nav-link-icon" aria-hidden="true" />
                {t(l.name)}
              </NavLink>
            </div>
          );
        })}

        {sections.map((s) => {
          const sectionActive = s.items.some((i) => isActive(i.path));
          const isOpen = open === s.key;
          const cols = s.items.length > 6 ? 2 : 1;

          return (
            <div className={`nav-group ${isOpen ? 'open' : ''}`} key={s.key}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.key)}
                aria-expanded={isOpen}
                className={`nav-link ${sectionActive ? 'active' : ''}`}
              >
                {t(s.label)}
                <Icons.chevronDown size={14} className="nav-caret" aria-hidden="true" />
              </button>

              {isOpen && (
                <div
                  ref={panelRef}
                  className={`dropdown ${flip ? 'flip' : ''}`}
                  data-cols={cols}
                >
                  {s.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`dropdown-item ${isActive(item.path) ? 'active' : ''}`}
                      >
                        <ItemIcon size={15} className="dropdown-icon" aria-hidden="true" />
                        {t(item.name)}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default AppTopNav;

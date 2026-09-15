import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useLayoutPrefs } from '../../hooks/useLayoutPrefs';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';
import { useT } from '../../context/LanguageContext';
import { INSTITUTE } from '../common/Logo';
import { Icons } from '../common/icons';

/**
 * The vertical side menu — bk-steels' `.sidemenu`.
 *
 * The class names here are deliberately bk-steels' own rather than this app's:
 * all six Sidemenu Layout Styles (Closed, Icon Text, Icon Overlay, Detached,
 * Double, Default) are expressed as CSS against these exact hooks, so the
 * markup has to match for the Switcher's choices to do anything.
 *
 * Sections are rendered as collapsible groups. In the collapsed rail layouts
 * the CSS re-positions `.sidemenu-sub` to fly out beside the rail instead of
 * expanding underneath — no JS branch needed.
 */
const Sidebar = ({ onNavigate, mobile = false }) => {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { prefs } = useLayoutPrefs();
  const { t } = useT();

  const sections = visibleSections(can);
  const links = visibleTopLinks(can);

  const isActive = (p) => pathname === p || pathname.startsWith(`${p}/`);

  /*
    Which section is expanded. The one holding the current route opens on
    arrival, so you can always see where you are in the menu.
  */
  const [open, setOpen] = useState(
    () => sections.find((s) => s.items.some((i) => isActive(i.path)))?.key || null
  );
  useEffect(() => {
    const here = sections.find((s) => s.items.some((i) => isActive(i.path)));
    if (here) setOpen(here.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // "Menu Hover" opens a section on pointer-enter instead of on click.
  const hoverOpens = prefs.menuStyle === 'hover' || prefs.menuStyle === 'icon-hover';
  const sectionProps = (key) => (hoverOpens && !mobile
    ? { onMouseEnter: () => setOpen(key), onMouseLeave: () => setOpen(null) }
    : {});

  return (
    <aside className={mobile ? 'sidemenu-mobile flex flex-col h-full bg-[var(--surface-1)]' : 'sidemenu'}>

      <Link to="/dashboard" className="sidemenu-brand" title={INSTITUTE.name} onClick={onNavigate}>
        <span className="sidemenu-mark">
          <img src="/logonew.png" alt="" width={28} height={28} />
        </span>
        <span className="sidemenu-brand-text">
          <strong>{INSTITUTE.short}</strong>
          <em>{INSTITUTE.city} · {INSTITUTE.since}</em>
        </span>
      </Link>

      <div className="sidemenu-scroll">
        <ul className="sidemenu-list">

          {/* Flat, one-click destinations */}
          {links.map((l) => (
            <li key={l.path}>
              <NavLink
                to={l.path}
                onClick={onNavigate}
                title={t(l.name)}
                className={`sidemenu-link ${isActive(l.path) ? 'active' : ''}`}
              >
                <l.icon size={18} className="sidemenu-icon" aria-hidden="true" />
                <span className="sidemenu-label">{t(l.name)}</span>
              </NavLink>
            </li>
          ))}

          {sections.map((s) => {
            const expanded = open === s.key;
            const SectionIcon = s.items[0]?.icon || Icons.folder;
            return (
              <li
                key={s.key}
                className={`sidemenu-sec ${expanded ? 'open' : ''}`}
                {...sectionProps(s.key)}
              >
                <button
                  type="button"
                  className={`sidemenu-link ${s.items.some((i) => isActive(i.path)) ? 'active' : ''}`}
                  aria-expanded={expanded}
                  title={t(s.label)}
                  onClick={() => setOpen(expanded ? null : s.key)}
                >
                  <SectionIcon size={18} className="sidemenu-icon" aria-hidden="true" />
                  <span className="sidemenu-label">{t(s.label)}</span>
                  <Icons.chevronDown size={14} className="sidemenu-caret" aria-hidden="true" />
                </button>

                <div className="sidemenu-sub">
                  {/* Only shown by the rail layouts, where the fly-out panel has
                      lost the section heading it was sitting under. */}
                  <p className="sidemenu-sub-head">{t(s.label)}</p>
                  {s.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onNavigate}
                      className={`sidemenu-sub-item ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <item.icon size={15} className="sidemenu-sub-icon" aria-hidden="true" />
                      {t(item.name)}
                    </NavLink>
                  ))}
                </div>
              </li>
            );
          })}

          <li>
            <NavLink
              to="/profile"
              onClick={onNavigate}
              title={t('Profile')}
              className={`sidemenu-link ${isActive('/profile') ? 'active' : ''}`}
            >
              <Icons.staff size={18} className="sidemenu-icon" aria-hidden="true" />
              <span className="sidemenu-label">{t('Profile')}</span>
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="sidemenu-foot">
        {new Date().getFullYear()} {INSTITUTE.short}
      </div>
    </aside>
  );
};

export default Sidebar;

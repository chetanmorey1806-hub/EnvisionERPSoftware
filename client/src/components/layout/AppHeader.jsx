import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { AuthContext } from '../../context/AuthContext';
import { Icons } from '../common/icons';
import { INSTITUTE } from '../common/Logo';
import PageHelp from '../common/PageHelp';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationMenu from './NotificationMenu';
import ProfileMenu from './ProfileMenu';
import ChatWidget from '../chat/ChatWidget';

/**
 * The gradient top bar — bk-steels' `.app-header`.
 *
 * Full-bleed gradient, but its contents measure to the same `--app-max` column
 * as the menu bar and the page below, so all three line up on a wide screen.
 * The logo sits on a white tile because the artwork is dark navy on
 * transparency and would otherwise vanish into the maroon end of the gradient.
 */
const humanise = (seg) => seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const AppHeader = ({ onOpenSwitcher }) => {
  const { toggleSidebar } = useContext(SidebarContext);
  const { user, logout } = useContext(AuthContext);
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const here = segments.length ? humanise(segments[segments.length - 1]) : 'Dashboard';

  return (
    <header className="app-header">
      <button onClick={toggleSidebar} className="tool-btn menu-btn lg:!hidden" aria-label="Toggle navigation">
        <Icons.menu size={19} aria-hidden="true" />
      </button>

      <Link to="/dashboard" className="header-mark" title={INSTITUTE.name}>
        <img src="/logonew.png" alt="" width={34} height={34} />
      </Link>

      <div className="header-title">
        <h1>{INSTITUTE.short} · {here}</h1>
        <p>{INSTITUTE.name}</p>
      </div>

      <div className="header-tools">
        <button
          onClick={() => window.dispatchEvent(new Event('erp:open-palette'))}
          className="pill-btn hide-sm"
          title="Search (⌘K)"
        >
          <Icons.search size={14} aria-hidden="true" />
          <span>Search</span>
        </button>

        <div className="hide-md"><PageHelp /></div>

        <div className="hide-sm"><LanguageSwitcher /></div>
        <ThemeSwitcher />
        <ChatWidget />
        <NotificationMenu />

        {/* Two separate affordances: the sliders repaint the shell, the gear
            opens the settings screens. They used to be the same button, which
            meant there was no way into Settings from the header at all. */}
        <button onClick={onOpenSwitcher} className="tool-btn" aria-label="Theme switcher" title="Theme switcher">
          <Icons.sliders size={18} aria-hidden="true" />
        </button>

        <Link to="/settings" className="tool-btn" aria-label="Settings" title="Settings">
          <Icons.settings size={18} aria-hidden="true" />
        </Link>

        <button onClick={logout} className="tool-btn hide-sm" aria-label="Sign out" title="Sign out">
          <Icons.logout size={18} aria-hidden="true" />
        </button>

        <span className="hide-md text-[12px] font-semibold opacity-90 px-1">
          {user?.name?.split(' ')[0] || 'User'}
        </span>
        <ProfileMenu />
      </div>
    </header>
  );
};

export default AppHeader;

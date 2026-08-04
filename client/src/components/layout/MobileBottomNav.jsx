import React, { useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { SidebarContext } from '../../context/SidebarContext';
import { Icons } from '../common/icons';
import { useT } from '../../context/LanguageContext';

/**
 * Thumb-reachable bottom navigation, mobile only (< md).
 * Items are filtered by the user's permissions, so a counselor and an
 * instructor see different tabs. Labels are always visible — icon-only
 * navigation consistently fails first-time users.
 */
const ITEMS = [
  { name: 'Home', path: '/dashboard', icon: Icons.dashboard, permission: 'dashboard.view' },
  { name: 'Students', path: '/students', icon: Icons.students, permission: 'students.view' },
  { name: 'Leads', path: '/enquiries', icon: Icons.enquiries, permission: 'enquiries.view' },
  { name: 'Classes', path: '/my-classes', icon: Icons.faculty, permission: 'attendance.view' },
  { name: 'Fees', path: '/fees', icon: Icons.fees, permission: 'fees.view' },
];

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { t } = useT();
  const { toggleSidebar } = useContext(SidebarContext);

  // Max 4 permitted tabs + a "More" button that opens the full drawer.
  const tabs = useMemo(() => ITEMS.filter((i) => can(i.permission)).slice(0, 4), [can]);
  if (tabs.length === 0) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
                 border-t border-gray-200 dark:border-slate-800 pb-safe"
      aria-label="Primary"
    >
      <ul className="flex items-stretch">
        {tabs.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-14 py-1.5 transition-colors press ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                }`}
              >
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                  className={`transition-transform ${active ? 'scale-110' : ''}`}
                />
                <span className="text-[10px] font-bold tracking-tight">{t(item.name)}</span>
                <span
                  className={`h-0.5 w-6 rounded-full transition-all ${
                    active ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent'
                  }`}
                />
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            onClick={toggleSidebar}
            aria-label="More navigation"
            className="w-full flex flex-col items-center justify-center gap-0.5 min-h-14 py-1.5 text-gray-400 dark:text-slate-500 press"
          >
            <Icons.menu size={20} strokeWidth={2} aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-tight">{t('More')}</span>
            <span className="h-0.5 w-6" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;

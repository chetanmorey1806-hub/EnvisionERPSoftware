import React, { useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { usePermissions } from '../../hooks/usePermissions';
import Logo, { INSTITUTE } from '../common/Logo';
import { Icons } from '../common/icons';

/**
 * Navigation is data-driven: every item declares the permission required to see
 * it, and the menu is filtered against the permissions the API returned for the
 * signed-in user. Groups with no visible items disappear automatically.
 */
const MENU = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: Icons.dashboard, permission: 'dashboard.view' },
      { name: 'Students', path: '/students', icon: Icons.students, permission: 'students.view' },
      { name: 'Admissions', path: '/admissions', icon: Icons.admissions, permission: 'admissions.view' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { name: 'My Classes', path: '/instructor', icon: Icons.faculty, permission: 'attendance.view' },
      { name: 'Classroom', path: '/classroom', icon: Icons.courses, permission: 'classroom.view' },
      { name: 'Rate Trainer', path: '/feedback', icon: Icons.star, permission: 'feedback.create' },
      { name: 'Courses', path: '/courses', icon: Icons.courses, permission: 'courses.view' },
      { name: 'Batches', path: '/batches', icon: Icons.batches, permission: 'batches.view' },
      { name: 'Attendance', path: '/attendance', icon: Icons.attendance, permission: 'attendance.view' },
      { name: 'Examinations', path: '/examination', icon: Icons.exams, permission: 'exams.view' },
      { name: 'Results', path: '/results', icon: Icons.results, permission: 'results.view' },
      { name: 'Certificates', path: '/certificates', icon: Icons.certificates, permission: 'certificates.view' },
    ],
  },
  {
    title: 'People',
    items: [
      { name: 'Faculty', path: '/faculty', icon: Icons.faculty, permission: 'faculty.view' },
      { name: 'Staff', path: '/staff', icon: Icons.staff, permission: 'staff.view' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { name: 'Enquiries', path: '/enquiry', icon: Icons.enquiries, permission: 'enquiries.view' },
      { name: 'Follow-ups', path: '/followup', icon: Icons.followups, permission: 'followups.view' },
      { name: 'Placements', path: '/placement', icon: Icons.placements, permission: 'placements.view' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Fees', path: '/fees', icon: Icons.fees, permission: 'fees.view' },
      { name: 'Library', path: '/library', icon: Icons.library, permission: 'library.view' },
      { name: 'Inventory', path: '/inventory', icon: Icons.inventory, permission: 'inventory.view' },
      { name: 'Reports', path: '/reports', icon: Icons.reports, permission: 'reports.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Trainer Performance', path: '/trainer-performance', icon: Icons.star, permission: 'feedback.view' },
      { name: 'Users', path: '/users', icon: Icons.users, permission: 'users.view' },
      { name: 'Roles', path: '/roles', icon: Icons.roles, permission: 'roles.view' },
      { name: 'Settings', path: '/settings', icon: Icons.settings, permission: 'settings.view' },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { isOpen } = useContext(SidebarContext);
  const { can } = usePermissions();

  // Filter the menu by the user's actual permissions.
  const menu = useMemo(
    () =>
      MENU.map((group) => ({
        ...group,
        items: group.items.filter((item) => can(item.permission)),
      })).filter((group) => group.items.length > 0),
    [can]
  );

  return (
    <aside
      className={`bg-slate-950 text-slate-200 flex flex-col h-full shadow-2xl transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="h-16 flex items-center px-4 border-b border-slate-900 shrink-0">
        {isOpen ? (
          /* The logo's text is dark navy — it needs a white plate on this sidebar. */
          <Link to="/dashboard" className="min-w-0 animate-fade-in" title={INSTITUTE.name}>
            <Logo className="h-9" plate shine />
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500 mt-1.5 whitespace-nowrap">
              {INSTITUTE.city} · Since {INSTITUTE.since}
            </p>
          </Link>
        ) : (
          <Link
            to="/dashboard"
            title={INSTITUTE.name}
            className="mx-auto h-9 w-9 grid place-items-center rounded-lg bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20"
          >
            E
          </Link>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden px-3 space-y-6">
        {menu.map((group) => (
          <div key={group.title} className="space-y-1">
            {isOpen && (
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <item.icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                  <span
                    className={`transition-all duration-200 whitespace-nowrap ${
                      isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden pointer-events-none'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

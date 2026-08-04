import { Icons } from '../components/common/icons';

/**
 * Portal definitions — one per login/register "door".
 *
 * `backendRole` is what the API stores. `roles` lists every account role that
 * belongs to this portal (admin door also accepts super_admin). `canRegister`
 * is false for Admin: administrator accounts are provisioned internally, never
 * self-created — a deliberate security boundary the server also enforces.
 */
export const AUTH_ROLES = {
  admin: {
    slug: 'admin',
    label: 'Administrator',
    tagline: 'Global command center',
    backendRole: 'admin',
    roles: ['admin', 'super_admin'],
    icon: Icons.roles,
    canRegister: false,
    accent: 'blue',
    grad: 'from-blue-600 to-indigo-700',
    solid: 'bg-blue-600 hover:bg-blue-700',
    ring: 'focus:ring-blue-500/40',
    text: 'text-blue-600 dark:text-blue-400',
    soft: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  },
  trainer: {
    slug: 'trainer',
    label: 'Trainer',
    tagline: 'Your batches, rosters & grading',
    backendRole: 'faculty',
    roles: ['faculty'],
    icon: Icons.faculty,
    canRegister: true,
    accent: 'violet',
    grad: 'from-violet-600 to-purple-700',
    solid: 'bg-violet-600 hover:bg-violet-700',
    ring: 'focus:ring-violet-500/40',
    text: 'text-violet-600 dark:text-violet-400',
    soft: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  },
  placement: {
    slug: 'placement',
    label: 'Placement Officer',
    tagline: 'Hiring partners & candidate pipelines',
    backendRole: 'placement',
    roles: ['placement'],
    icon: Icons.briefcase,
    canRegister: true,
    accent: 'emerald',
    grad: 'from-emerald-600 to-teal-700',
    solid: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  },
  student: {
    slug: 'student',
    label: 'Student',
    tagline: 'Attendance, fees, classwork & certificates',
    backendRole: 'student',
    roles: ['student'],
    icon: Icons.students,
    canRegister: true,
    accent: 'amber',
    grad: 'from-amber-500 to-orange-600',
    solid: 'bg-amber-500 hover:bg-amber-600',
    ring: 'focus:ring-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  },
};

export const ROLE_ORDER = ['admin', 'trainer', 'placement', 'student'];

export const getPortal = (slug) => AUTH_ROLES[slug] || null;

/** Which portal does a logged-in account's role belong to? */
export const portalForRole = (role) =>
  Object.values(AUTH_ROLES).find((p) => p.roles.includes(role)) || null;

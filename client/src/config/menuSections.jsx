import React from 'react';
import { Icons } from '../components/common/icons';

// ---- Pages -----------------------------------------------------------------
import Dashboard from '../pages/dashboard/Dashboard';
import DocumentVault from '../pages/documents/DocumentVault';
import StudentsPage from '../pages/students/StudentsPage';
import StudentForm from '../pages/students/StudentForm';
import FacultyPage from '../pages/faculty/FacultyPage';
import TrainerForm from '../pages/faculty/TrainerForm';
import CoursesPage from '../pages/courses/CoursesPage';
import CourseForm from '../pages/courses/CourseForm';
import BatchesPage from '../pages/batches/BatchesPage';
import BatchForm from '../pages/batches/BatchForm';
import StaffPage from '../pages/staff/StaffPage';
import PartnersPage from '../pages/partners/PartnersPage';
import PartnerForm from '../pages/partners/PartnerForm';
import RoomsPage from '../pages/rooms/RoomsPage';


import EnquiryPage from '../pages/enquiry/EnquiryPage';
import FollowupPage from '../pages/followup/FollowupPage';
import AdmissionsPage from '../pages/admissions/AdmissionsPage';
import FeesPage from '../pages/fees/FeesPage';

import ClassroomSwitch from '../pages/classroom/ClassroomSwitch';
import InstructorPortal from '../pages/faculty/InstructorPortal';
import AttendancePage from '../pages/attendance/AttendancePage';
import MyAttendance from '../pages/attendance/MyAttendance';
import ExaminationPage from '../pages/examination/ExaminationPage';
import ResultsPage from '../pages/results/ResultsPage';
import StudentFeedback from '../pages/feedback/StudentFeedback';

import CertificatesPage from '../pages/certificates/CertificatesPage';
import LibraryPage from '../pages/library/LibraryPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import PlacementPage from '../pages/placement/PlacementPage';
import ReadinessPage from '../pages/faculty/ReadinessPage';
import PortfolioPage from '../pages/students/PortfolioPage';

import ReportsPage from '../pages/reports/ReportsPage';
import TrainerPerformance from '../pages/admin/TrainerPerformance';

import SettingsPage from '../pages/settings/SettingsPage';
import GlobalSettingsPage from '../pages/settings/GlobalSettingsPage';
import UsersPage from '../pages/users/UsersPage';
import RolesPage from '../pages/roles/RolesPage';
import ProfilePage from '../pages/profile/ProfilePage';

/**
 * MENU REGISTRY — the single source of truth for navigation AND routing.
 *
 * Adding an item here registers its route automatically and makes it appear in
 * the grouped top-nav (desktop) / drawer (mobile). Every item declares the
 * permission required to see it; the menu is filtered against the permissions
 * the API returned for the signed-in user, so nothing is merely hidden.
 *
 * Groups mirror how an institute actually works:
 *   Master        — the records everything else references
 *   Admissions    — the enquiry → admission → fee pipeline
 *   Academics     — day-to-day teaching and assessment
 *   Resources     — certificates, library, inventory, placement
 *   Reports       — analytics
 *   Settings      — institute configuration & access control
 *
 * `tone` is the section's colour in the navigation and on its page hero. Giving
 * each area its own hue lets the eye find a module by colour before it reads
 * the label, and keeps a page visually tied to the menu entry that opened it.
 */
export const menuSections = [
  {
    key: 'master',
    label: 'Master',
    tone: 'brand',
    items: [
      { icon: Icons.students, name: 'Students', path: '/students', permission: 'students.view', element: <StudentsPage /> },
      { icon: Icons.faculty, name: 'Trainers', path: '/trainers', permission: 'faculty.view', element: <FacultyPage /> },
      { icon: Icons.courses, name: 'Courses', path: '/courses', permission: 'courses.view', element: <CoursesPage /> },
      { icon: Icons.batches, name: 'Batches', path: '/batches', permission: 'batches.view', element: <BatchesPage /> },
      { icon: Icons.team, name: 'Classrooms & Labs', path: '/rooms', permission: 'classrooms.view', element: <RoomsPage /> },
      { icon: Icons.staff, name: 'Staff', path: '/staff', permission: 'staff.view', element: <StaffPage /> },
      { icon: Icons.briefcase, name: 'Corporate Partners', path: '/partners', permission: 'partners.view', element: <PartnersPage /> },
    ],
  },
  {
    key: 'admissions',
    tone: 'amber',
    label: 'Admissions',
    items: [
      { icon: Icons.enquiries, name: 'Enquiries', path: '/enquiries', permission: 'enquiries.view', element: <EnquiryPage /> },
      { icon: Icons.followups, name: 'Follow-ups', path: '/followups', permission: 'followups.view', element: <FollowupPage /> },
      { icon: Icons.admissions, name: 'Admissions', path: '/admissions', permission: 'admissions.view', element: <AdmissionsPage /> },
      { icon: Icons.fees, name: 'Fee Collection', path: '/fees', permission: 'fees.manage', element: <FeesPage /> },
    ],
  },
  {
    key: 'academics',
    tone: 'violet',
    label: 'Academics',
    items: [
      { icon: Icons.faculty, name: 'My Classes', path: '/my-classes', permission: 'attendance.manage', element: <InstructorPortal /> },
      { icon: Icons.courses, name: 'Classroom', path: '/classroom', permission: 'classroom.view', element: <ClassroomSwitch /> },
      { icon: Icons.attendance, name: 'Attendance', path: '/attendance', permission: 'attendance.manage', element: <AttendancePage /> },
      { icon: Icons.exams, name: 'Examinations', path: '/examinations', permission: 'exams.view', element: <ExaminationPage /> },
      { icon: Icons.results, name: 'Results', path: '/results', permission: 'results.manage', element: <ResultsPage /> },
      { icon: Icons.results, name: 'Student Readiness', path: '/readiness', permission: 'employability.evaluate', element: <ReadinessPage /> },
      { icon: Icons.star, name: 'Rate Trainer', path: '/feedback', permission: 'feedback.create', element: <StudentFeedback /> },
      // Student self check-in. `feedback.create` is the codebase's student-facing
      // marker (same gate as Rate Trainer) — trainers/registrars don't hold it,
      // so the page stays where it belongs.
      { icon: Icons.attendance, name: 'My Attendance', path: '/my-attendance', permission: 'feedback.create', element: <MyAttendance /> },
    ],
  },
  {
    key: 'resources',
    tone: 'cyan',
    label: 'Resources',
    items: [
      { icon: Icons.certificates, name: 'Certificates', path: '/certificates', permission: 'certificates.issue', element: <CertificatesPage /> },
      { icon: Icons.library, name: 'Library', path: '/library', permission: 'library.view', element: <LibraryPage /> },
      { icon: Icons.inventory, name: 'Inventory', path: '/inventory', permission: 'inventory.view', element: <InventoryPage /> },
      { icon: Icons.placements, name: 'Placements', path: '/placements', permission: 'placements.match', element: <PlacementPage /> },
      { icon: Icons.briefcase, name: 'My Portfolio', path: '/portfolio', permission: 'portfolio.update', element: <PortfolioPage /> },
    ],
  },
  {
    key: 'reports',
    tone: 'green',
    label: 'Reports',
    items: [
      { icon: Icons.reports, name: 'Institute Reports', path: '/reports', permission: 'reports.view', element: <ReportsPage /> },
      { icon: Icons.star, name: 'Trainer Performance', path: '/trainer-performance', permission: 'feedback.view', element: <TrainerPerformance /> },
    ],
  },
  {
    key: 'settings',
    tone: 'slate',
    label: 'Settings',
    items: [
      { icon: Icons.settings, name: 'Institute Settings', path: '/settings', permission: 'settings.view', element: <SettingsPage /> },
      { icon: Icons.hash, name: 'Global Settings', path: '/settings/global', permission: 'settings.view', element: <GlobalSettingsPage /> },
      { icon: Icons.users, name: 'User Management', path: '/users', permission: 'users.view', element: <UsersPage /> },
      { icon: Icons.roles, name: 'Roles & Permissions', path: '/roles', permission: 'roles.view', element: <RolesPage /> },
    ],
  },
];

/**
 * TOP-LEVEL LINKS — rendered flat in the nav bar, not inside a dropdown group.
 * These are the destinations people hit constantly, so they get one click.
 */
export const topLinks = [
  { icon: Icons.dashboard, name: 'Dashboard', path: '/dashboard', permission: 'dashboard.view', element: <Dashboard /> },
  { icon: Icons.admissions, name: 'Document Vault', path: '/documents', permission: 'documents.view', element: <DocumentVault /> },
];

/** Top-level links this user may actually see. */
export const visibleTopLinks = (can) => topLinks.filter((l) => !l.permission || can(l.permission));

/**
 * HIDDEN ROUTES — reachable, but never shown in the menu.
 * This is the List → New → Edit flow: a list page links to `/students/new`
 * and `/students/:id/edit`, which resolve here.
 */
export const hiddenRoutes = [
  { path: '/profile', element: <ProfilePage /> },

  { path: '/students/new', permission: 'students.create', element: <StudentForm /> },
  { path: '/students/:id/edit', permission: 'students.update', element: <StudentForm /> },

  { path: '/courses/new', permission: 'courses.create', element: <CourseForm /> },
  { path: '/courses/:id/edit', permission: 'courses.update', element: <CourseForm /> },

  { path: '/trainers/new', permission: 'faculty.create', element: <TrainerForm /> },
  { path: '/trainers/:id/edit', permission: 'faculty.update', element: <TrainerForm /> },

  { path: '/batches/new', permission: 'batches.create', element: <BatchForm /> },
  { path: '/batches/:id/edit', permission: 'batches.update', element: <BatchForm /> },

  { path: '/partners/new', permission: 'partners.create', element: <PartnerForm /> },
  { path: '/partners/:id/edit', permission: 'partners.update', element: <PartnerForm /> },
];

/** Flat list of every routable entry (menu + hidden). */
export const allRoutes = [
  ...topLinks,
  ...menuSections.flatMap((s) => s.items),
  ...hiddenRoutes,
];

/** Sections filtered to what this user may actually see. */
export const visibleSections = (can) =>
  menuSections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((s) => s.items.length > 0);

export default menuSections;

/**
 * RBAC seeding — roles, permissions and their mapping.
 *
 * Permissions are GENERATED from a `<module> -> [actions]` matrix rather than
 * hand-written rows, so adding a module automatically produces its permissions.
 * Role grants are expressed as rules (functions of the matrix), not static lists.
 *
 * Also ensures `users.role_id` exists and backfills it from the legacy
 * `users.role` enum. Idempotent — safe to run on every `npm run db:setup`.
 */

// module -> allowed actions
const MODULES = {
  dashboard: ['view'],
  students: ['view', 'create', 'update', 'delete'],
  admissions: ['view', 'create', 'update', 'delete'],
  courses: ['view', 'create', 'update', 'delete'],
  batches: ['view', 'create', 'update', 'delete'],
  faculty: ['view', 'create', 'update', 'delete'],
  staff: ['view', 'create', 'update', 'delete'],
  enquiries: ['view', 'create', 'update', 'delete', 'convert'],
  followups: ['view', 'create', 'update'],
  // `manage`   = take money at the desk (collect, receipts, dues list).
  // `structure` = set what a course COSTS, and forgive a fine. Separating these
  //               keeps the person who prices the course from the till.
  fees: ['view', 'create', 'update', 'export', 'manage', 'structure'],
  expenses: ['view', 'create', 'update', 'delete'],
  // `manage` = the batch-wide register. `view` alone only ever reads your OWN
  // record (enforced by middleware/scope.js), which is what a student holds.
  attendance: ['view', 'create', 'update', 'manage'],
  classroom: ['view', 'create', 'update', 'delete'],
  syllabus: ['view', 'create', 'update'],
  grades: ['view', 'create', 'update'],
  flags: ['view', 'create', 'resolve'],
  feedback: ['view', 'create'],
  leaves: ['view', 'create', 'approve'],
  classrooms: ['view', 'create', 'update'],
  payroll: ['view', 'update'],
  communications: ['view', 'send'],
  exams: ['view', 'create', 'update', 'delete'],
  results: ['view', 'create', 'update', 'manage'],
  // `issue` is its own grant: a certificate is the institute's word that someone
  // is qualified, so it must not fall out of a generic `create`.
  certificates: ['view', 'create', 'update', 'issue', 'revoke'],
  // `match` = run the candidate search and shortlist. `interview` = log a round
  // and tag a skill deficiency, which raises work on a trainer's dashboard —
  // so it is a separate grant from merely reading the pipeline.
  placements: ['view', 'create', 'update', 'match', 'interview'],
  // Employability is DERIVED, but three acts are human: evaluating, signing off
  // soft skills, and overriding (blocking a student). `override` is the
  // supervisor grant that also bypasses batch ownership.
  employability: ['view', 'evaluate', 'clear', 'override'],
  remedials: ['view', 'create', 'update'],
  portfolio: ['view', 'update'],
  library: ['view', 'create', 'update'],
  inventory: ['view', 'create', 'update'],
  reports: ['view', 'export'],
  users: ['view', 'create', 'update', 'delete'],
  roles: ['view', 'create', 'update', 'delete'],
  settings: ['view', 'update'],
  partners: ['view', 'create', 'update', 'delete'],
  documents: ['view', 'create', 'update', 'delete', 'share', 'manage'],
  notifications: ['view'],
  // Internal messaging between employees and trainers. Students deliberately do
  // NOT get this — holding `chat.view` is what puts you in the directory, so
  // granting it later is all it takes to include them.
  chat: ['view', 'send'],
};

const ROLES = [
  { name: 'super_admin', label: 'Super Admin', description: 'Unrestricted access to every module.', is_system: 1 },
  { name: 'admin', label: 'Administrator', description: 'Full operational access; cannot delete users or roles.', is_system: 1 },
  { name: 'faculty', label: 'Faculty', description: 'Teaching staff: academics, attendance and results.', is_system: 1 },
  { name: 'staff', label: 'Staff', description: 'Front-office: enquiries, admissions and fees.', is_system: 1 },
  { name: 'student', label: 'Student', description: 'Read-only access to their own academic records.', is_system: 1 },
  { name: 'placement', label: 'Placement Officer', description: 'Hiring partners, job postings, shortlists and placement metrics.', is_system: 1 },
  { name: 'branch_head', label: 'Branch Head', description: 'Runs a centre: everything operational plus P&L, but cannot touch users, roles or system settings.', is_system: 1 },
  { name: 'registrar', label: 'Front-Desk Registrar', description: 'Front desk: enquiries, admissions and taking fees. Cannot price a course or waive a fine.', is_system: 1 },
  { name: 'coordinator', label: 'Academic Coordinator', description: 'Owns delivery: batches, timetable, syllabus pacing, exams and certification. No money.', is_system: 1 },
  { name: 'accountant', label: 'Accountant', description: 'The books: fee plans, collections, dues, late fees, expenses, payroll and profit & loss. No academics.', is_system: 1 },
  { name: 'librarian', label: 'Librarian', description: 'Library and inventory: books, copies, issues and returns, and the institute\'s stock.', is_system: 1 },
  { name: 'teaching_assistant', label: 'Teaching Assistant', description: 'Helps trainers in every class: classwork, grading drafts, attendance and marks. Cannot issue certificates or sign off job-readiness.', is_system: 1 },
];

const ACTION_LABEL = {
  view: 'View', create: 'Create', update: 'Update', delete: 'Delete', export: 'Export',
  approve: 'Approve', send: 'Send', manage: 'Manage', resolve: 'Resolve',
  structure: 'Define structure', issue: 'Issue', revoke: 'Revoke', convert: 'Convert',
  share: 'Share', match: 'Match candidates', interview: 'Log interviews',
  evaluate: 'Evaluate', clear: 'Sign off', override: 'Override',
};

/** All permission names, derived from the matrix. */
function allPermissions() {
  const list = [];
  for (const [module, actions] of Object.entries(MODULES)) {
    for (const action of actions) {
      list.push({
        name: `${module}.${action}`,
        module,
        action,
        label: `${ACTION_LABEL[action] || action} ${module}`,
      });
    }
  }
  return list;
}

const has = (module, action) => (MODULES[module] || []).includes(action);
const grant = (modules, actions) =>
  modules.flatMap((m) => actions.filter((a) => has(m, a)).map((a) => `${m}.${a}`));

/** role name -> permission names (computed, never a hand-typed list). */
function permissionsForRole(roleName, permissionNames) {
  switch (roleName) {
    case 'super_admin':
      return permissionNames;

    case 'admin':
      return permissionNames.filter((p) => !['users.delete', 'roles.delete'].includes(p));

    case 'faculty':
      return [
        ...grant(['dashboard', 'students', 'courses', 'batches', 'exams', 'certificates'], ['view']),
        ...grant(['attendance', 'results', 'classroom'], ['view', 'create', 'update']),
        // The trainer runs the register and enters marks for their own batches.
        ...grant(['attendance', 'results'], ['manage']),
        ...grant(['leaves'], ['view', 'create']),
        ...grant(['syllabus'], ['view', 'update']),
        ...grant(['grades'], ['view', 'create', 'update']),
        ...grant(['flags'], ['view', 'create']),
        ...grant(['certificates'], ['create']),
        // The trainer is the gatekeeper of readiness: they benchmark skills and
        // sign off soft skills, but cannot block a student or override a status.
        ...grant(['employability'], ['view', 'evaluate', 'clear']),
        ...grant(['remedials'], ['view', 'create', 'update']),
        ...grant(['portfolio'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['notifications'], ['view']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'staff':
      // Counselors live here: full lead lifecycle including conversion.
      return [
        ...grant(['dashboard', 'courses', 'batches', 'reports', 'classrooms'], ['view']),
        ...grant(['students', 'admissions', 'enquiries', 'followups', 'fees'], ['view', 'create', 'update']),
        ...grant(['fees'], ['manage']),
        ...grant(['flags'], ['view', 'resolve']),
        ...grant(['enquiries'], ['convert']),
        ...grant(['partners'], ['view', 'create', 'update']),
        ...grant(['notifications'], ['view']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'branch_head':
      // Runs the centre. Sees the money (both sides) and every operational
      // module — but user/role administration and system settings stay central.
      return permissionNames.filter(
        (p) => !p.startsWith('users.') && !p.startsWith('roles.') && !p.startsWith('settings.update')
      );

    case 'registrar':
      // The till, not the price list. Deliberately NO fees.structure, so a
      // registrar can take payments but cannot discount a course, change what
      // it costs, or waive a fine they just imposed.
      return [
        ...grant(['dashboard', 'courses', 'batches', 'classrooms'], ['view']),
        ...grant(['students', 'admissions', 'enquiries', 'followups'], ['view', 'create', 'update']),
        ...grant(['enquiries'], ['convert']),
        ...grant(['fees'], ['view', 'manage']),
        ...grant(['attendance'], ['view', 'manage']),
        ...grant(['library'], ['view', 'update']),
        ...grant(['notifications'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'share']),
      ];

    case 'coordinator':
      // Owns academic delivery end to end, including signing off certificates —
      // but has no access to fees or expenses at all.
      return [
        ...grant(['dashboard', 'students', 'faculty', 'reports'], ['view']),
        ...grant(['courses', 'batches', 'exams'], ['view', 'create', 'update', 'delete']),
        ...grant(['classrooms', 'syllabus', 'grades', 'results', 'classroom'], ['view', 'create', 'update']),
        ...grant(['attendance', 'results'], ['manage']),
        ...grant(['certificates'], ['view', 'create', 'issue', 'revoke']),
        // The coordinator owns academic delivery, so they can override a
        // readiness status and see every trainer's remedial queue.
        ...grant(['employability'], ['view', 'evaluate', 'clear', 'override']),
        ...grant(['remedials'], ['view', 'create', 'update']),
        ...grant(['placements'], ['view']),
        ...grant(['portfolio'], ['view']),
        ...grant(['flags'], ['view', 'resolve']),
        ...grant(['feedback'], ['view']),
        ...grant(['leaves'], ['view', 'approve']),
        ...grant(['notifications'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'placement':
      // Job portals & candidate pipelines only — no fees, no grades, no roles.
      return [
        ...grant(['dashboard', 'students', 'courses', 'batches', 'reports'], ['view']),
        ...grant(['placements'], ['view', 'create', 'update', 'match', 'interview']),
        // Reads readiness to know who to put forward; cannot MAKE anyone ready.
        // Job-Ready is the trainer's and the data's decision, not sales'.
        ...grant(['employability'], ['view']),
        ...grant(['remedials'], ['view']),
        ...grant(['portfolio'], ['view']),
        ...grant(['communications'], ['view', 'send']),
        ...grant(['partners'], ['view', 'create', 'update']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'accountant':
      // Owns the money end to end — including pricing a course and waiving a
      // fine, which the registrar deliberately cannot do — but no academics.
      return [
        ...grant(['dashboard', 'students', 'courses', 'batches', 'admissions'], ['view']),
        ...grant(['fees'], ['view', 'create', 'update', 'export', 'manage', 'structure']),
        ...grant(['expenses'], ['view', 'create', 'update', 'delete']),
        ...grant(['payroll'], ['view', 'update']),
        ...grant(['reports'], ['view', 'export']),
        ...grant(['partners'], ['view']),
        ...grant(['notifications'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'librarian':
      return [
        ...grant(['dashboard', 'students', 'courses', 'batches'], ['view']),
        ...grant(['library', 'inventory'], ['view', 'create', 'update']),
        ...grant(['notifications'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'share']),
      ];

    case 'teaching_assistant':
      // A co-teacher in every class. Drafts grades and keeps registers, but the
      // decisions that carry the institute's name stay with trainers and the
      // coordinator: no certificates, no readiness sign-off, no overrides.
      return [
        ...grant(['dashboard', 'students', 'courses', 'batches', 'exams', 'faculty'], ['view']),
        ...grant(['classroom'], ['view', 'create', 'update']),
        ...grant(['attendance'], ['view', 'create', 'update', 'manage']),
        ...grant(['results'], ['view', 'create', 'update', 'manage']),
        ...grant(['syllabus'], ['view']),
        ...grant(['grades'], ['view', 'create', 'update']),
        ...grant(['remedials'], ['view', 'update']),
        ...grant(['flags'], ['view', 'create']),
        ...grant(['leaves'], ['view', 'create']),
        ...grant(['notifications'], ['view']),
        ...grant(['chat'], ['view', 'send']),
        ...grant(['documents'], ['view', 'create', 'update', 'delete', 'share']),
      ];

    case 'student':
      return grant(
        ['dashboard', 'results', 'attendance', 'fees', 'certificates', 'library',
         'notifications', 'classroom', 'grades', 'placements'],
        ['view']
      ).concat(grant(['feedback'], ['create']))
       // Their own portfolio: resume, GitHub, project links. Self-scoped in the
       // route — a student can only ever write their OWN.
       .concat(grant(['portfolio'], ['view', 'update']))
       .concat(grant(['employability'], ['view']))
       .concat(grant(['remedials'], ['view']))
       .concat(grant(['documents'], ['view', 'create', 'update', 'delete']));

    default:
      return grant(['dashboard'], ['view']);
  }
}

/** Add users.role_id if the column doesn't exist yet (legacy databases). */
async function ensureRoleIdColumn(conn, dbName) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'`,
    [dbName]
  );
  if (rows.length === 0) {
    await conn.query('ALTER TABLE `users` ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `role`');
    await conn.query('ALTER TABLE `users` ADD INDEX `idx_users_role_id` (`role_id`)');
    console.log('[db:setup] users.role_id column added.');
  }
}

async function seedRbac(conn, dbName) {
  await ensureRoleIdColumn(conn, dbName);

  // 1. Roles
  for (const r of ROLES) {
    await conn.query(
      `INSERT INTO roles (name, label, description, is_system) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`,
      [r.name, r.label, r.description, r.is_system]
    );
  }

  // 2. Permissions (generated)
  const perms = allPermissions();
  for (const p of perms) {
    await conn.query(
      `INSERT INTO permissions (name, module, action, label) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`,
      [p.name, p.module, p.action, p.label]
    );
  }

  // 3. Map role -> permissions
  const [permRows] = await conn.query('SELECT id, name FROM permissions');
  const permId = new Map(permRows.map((p) => [p.name, p.id]));
  const permissionNames = permRows.map((p) => p.name);

  const [roleRows] = await conn.query('SELECT id, name FROM roles');
  for (const role of roleRows) {
    const granted = permissionsForRole(role.name, permissionNames);
    for (const name of granted) {
      const pid = permId.get(name);
      if (!pid) continue;
      await conn.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [role.id, pid]
      );
    }
  }

  // 4. Backfill users.role_id from the legacy role enum
  await conn.query(
    'UPDATE users u JOIN roles r ON r.name = u.role SET u.role_id = r.id WHERE u.role_id IS NULL'
  );

  console.log(
    `[db:setup] RBAC seeded — ${roleRows.length} roles, ${perms.length} permissions generated.`
  );
}

module.exports = { seedRbac, MODULES, ROLES, allPermissions, permissionsForRole };

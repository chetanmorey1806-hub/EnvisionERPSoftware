/**
 * Idempotent column migrations for tables that already exist in the wild.
 *
 * `CREATE TABLE IF NOT EXISTS` in the schema file covers fresh installs, but it
 * silently skips existing tables — so new columns are added here instead.
 * Runs automatically as part of `npm run db:setup`.
 */

async function columnExists(conn, db, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]
  );
  return rows.length > 0;
}

async function ensureColumn(conn, db, table, column, ddl) {
  if (await columnExists(conn, db, table, column)) return false;
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
  console.log(`[db:setup] ${table}.${column} added.`);
  return true;
}

async function runMigrations(conn, db) {
  // ---- Lead management fields on enquiries --------------------------------
  await ensureColumn(conn, db, 'enquiries', 'temperature',
    "ENUM('hot','warm','cold') NOT NULL DEFAULT 'warm' AFTER status");
  await ensureColumn(conn, db, 'enquiries', 'course_id',
    'INT UNSIGNED NULL AFTER course_interest');
  await ensureColumn(conn, db, 'enquiries', 'qualification',
    'VARCHAR(120) NULL AFTER course_id');       // student background
  await ensureColumn(conn, db, 'enquiries', 'occupation',
    'VARCHAR(120) NULL AFTER qualification');
  await ensureColumn(conn, db, 'enquiries', 'callback_at',
    'DATETIME NULL AFTER temperature');
  await ensureColumn(conn, db, 'enquiries', 'student_id',
    'INT UNSIGNED NULL AFTER assigned_to');     // set once converted

  // ---- Structured batch timing (required for overlap detection) -----------
  // `timeline` stays as a human label; these drive the conflict check.
  await ensureColumn(conn, db, 'batches', 'start_time', 'TIME NULL AFTER timeline');
  await ensureColumn(conn, db, 'batches', 'end_time', 'TIME NULL AFTER start_time');
  await ensureColumn(conn, db, 'batches', 'days_of_week',
    "JSON NULL AFTER end_time"); // e.g. ["mon","wed","fri"]; NULL = every day

  // ---- Admin-configured scheduling policy ---------------------------------
  await ensureColumn(conn, db, 'institution_settings', 'max_batches_per_trainer_per_day', 'INT UNSIGNED NOT NULL DEFAULT 4');
  await ensureColumn(conn, db, 'institution_settings', 'open_time', "TIME NOT NULL DEFAULT '08:00:00'");
  await ensureColumn(conn, db, 'institution_settings', 'close_time', "TIME NOT NULL DEFAULT '21:00:00'");

  // ---- Feedback escalation (hidden from trainer) --------------------------
  await ensureColumn(conn, db, 'trainer_feedback', 'escalated', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn(conn, db, 'trainer_feedback', 'escalation_reason', 'VARCHAR(255) NULL');

  // ---- Predictive drop-out risk ------------------------------------------
  await ensureColumn(conn, db, 'students', 'risk_level', "ENUM('none','watch','high') NOT NULL DEFAULT 'none'");
  await ensureColumn(conn, db, 'students', 'risk_reason', 'VARCHAR(255) NULL');
  await ensureColumn(conn, db, 'students', 'risk_updated_at', 'DATETIME NULL');

  // ---- Placement role must exist in the legacy users.role enum ------------
  const [roleCol] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`, [db]
  );
  // The real grants live in role_permissions; this legacy enum just has to be
  // able to HOLD the name, or inserting one of the newer roles is truncated.
  if (roleCol.length && !roleCol[0].COLUMN_TYPE.includes('coordinator')) {
    await conn.query(
      `ALTER TABLE users MODIFY COLUMN role
       ENUM('super_admin','admin','faculty','staff','student','placement',
            'branch_head','registrar','coordinator')
       NOT NULL DEFAULT 'staff'`
    );
    console.log('[db:setup] users.role extended (branch_head, registrar, coordinator).');
  }

  // ---- Trainer module: assignment open/closed + batch sign-off ------------
  await ensureColumn(conn, db, 'course_materials', 'status', "ENUM('open','closed') NOT NULL DEFAULT 'open' AFTER due_date");
  await ensureColumn(conn, db, 'batches', 'completed_at', 'DATETIME NULL AFTER status');
  await ensureColumn(conn, db, 'batches', 'completed_by', 'INT UNSIGNED NULL AFTER completed_at');
  await ensureColumn(conn, db, 'certificates_issued', 'approved_by', 'INT UNSIGNED NULL AFTER template_id');

  // ---- Admin/CEO: trainer payroll rate + batch room allocation ------------
  await ensureColumn(conn, db, 'faculty', 'salary_type', "ENUM('hourly','monthly') NULL AFTER status");
  await ensureColumn(conn, db, 'faculty', 'salary_rate', 'DECIMAL(12,2) NULL AFTER salary_type');
  await ensureColumn(conn, db, 'batches', 'classroom_id', 'INT UNSIGNED NULL AFTER faculty_id');

  // ---- User management: sign-in can be switched off without deleting -------
  // Distinct from `status`: an account can be Active (a real, current member of
  // staff) while its sign-in is temporarily disabled. AuthService enforces it.
  await ensureColumn(conn, db, 'users', 'login_enabled', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER status');

  // ---- Trainer profile: designation + years of experience -----------------
  // The trainer form collects both; without the columns the model would drop
  // them silently on save.
  await ensureColumn(conn, db, 'faculty', 'designation', 'VARCHAR(120) NULL AFTER department');
  await ensureColumn(conn, db, 'faculty', 'experience', 'SMALLINT UNSIGNED NULL AFTER qualification');

  // ---- Guardian / emergency contact on the student record -----------------
  await ensureColumn(conn, db, 'students', 'guardian_name', 'VARCHAR(120) NULL AFTER address');
  await ensureColumn(conn, db, 'students', 'guardian_phone', 'VARCHAR(20) NULL AFTER guardian_name');
  await ensureColumn(conn, db, 'students', 'qualification', 'VARCHAR(120) NULL AFTER guardian_phone');

  // ---- Email verification for self-registration ---------------------------
  // Existing accounts default to verified; only new sign-ups start at 0.
  await ensureColumn(conn, db, 'users', 'is_verified', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER status');

  // ---- Classroom: classwork / homework on course_materials ----------------
  await ensureColumn(conn, db, 'course_materials', 'instructions', 'TEXT NULL AFTER title');
  await ensureColumn(conn, db, 'course_materials', 'duration_minutes', 'INT UNSIGNED NULL AFTER type');
  await ensureColumn(conn, db, 'course_materials', 'assigned_date', 'DATE NULL AFTER duration_minutes');

  const [cmType] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_materials' AND COLUMN_NAME = 'type'`,
    [db]
  );
  if (cmType.length && !cmType[0].COLUMN_TYPE.includes('classwork')) {
    await conn.query(
      `ALTER TABLE course_materials MODIFY COLUMN type
       ENUM('material','assignment','lab','classwork','homework')
       NOT NULL DEFAULT 'material'`
    );
    console.log('[db:setup] course_materials.type extended (classwork, homework).');
  }

  // ---- Link a student record to its login account (student portal) --------
  await ensureColumn(conn, db, 'students', 'user_id', 'INT UNSIGNED NULL AFTER id');
  const [stuUserIdx] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND INDEX_NAME = 'uq_students_user'`,
    [db]
  );
  if (stuUserIdx.length === 0) {
    await conn.query('ALTER TABLE `students` ADD UNIQUE KEY `uq_students_user` (`user_id`)');
  }

  // ---- Link a faculty record to its login account (instructor portal) -----
  await ensureColumn(conn, db, 'faculty', 'user_id', 'INT UNSIGNED NULL AFTER id');
  const [facUserIdx] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculty' AND INDEX_NAME = 'uq_faculty_user'`,
    [db]
  );
  if (facUserIdx.length === 0) {
    await conn.query('ALTER TABLE `faculty` ADD UNIQUE KEY `uq_faculty_user` (`user_id`)');
  }

  // ---- Unique institute-issued student ID ---------------------------------
  await ensureColumn(conn, db, 'students', 'student_uid', 'VARCHAR(40) NULL AFTER id');
  const [uidIdx] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND INDEX_NAME = 'uq_students_uid'`,
    [db]
  );
  if (uidIdx.length === 0) {
    await conn.query('ALTER TABLE `students` ADD UNIQUE KEY `uq_students_uid` (`student_uid`)');
  }

  // ---- Lifecycle statuses: add 'completed' / 'suspended' -------------------
  const [statusCol] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'status'`,
    [db]
  );
  if (statusCol.length && !statusCol[0].COLUMN_TYPE.includes('completed')) {
    await conn.query(
      `ALTER TABLE students MODIFY COLUMN status
       ENUM('active','inactive','completed','graduated','dropped','suspended')
       NOT NULL DEFAULT 'active'`
    );
    console.log('[db:setup] students.status extended (completed, suspended).');
  }

  // Helpful indexes for the counselor's filtered views (ignore if present).
  const addIndex = async (table, name, cols) => {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [db, table, name]
    );
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${cols})`);
    }
  };
  await addIndex('enquiries', 'idx_enq_temperature', '`temperature`');
  await addIndex('enquiries', 'idx_enq_callback', '`callback_at`');
  await addIndex('enquiries', 'idx_enq_status', '`status`');

  // ---- Finance: link a student's fee to the plan it was generated from -----
  // The tax/registration figures are FROZEN onto the student row at assignment
  // time. Editing a plan later must not silently restate what an existing
  // student already owes (or has paid).
  await ensureColumn(conn, db, 'fee_structures', 'plan_id',
    'INT UNSIGNED NULL AFTER student_id');
  await ensureColumn(conn, db, 'fee_structures', 'base_fee',
    'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER plan_id');
  await ensureColumn(conn, db, 'fee_structures', 'registration_fee',
    'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER base_fee');
  await ensureColumn(conn, db, 'fee_structures', 'tax_pct',
    'DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER registration_fee');
  await ensureColumn(conn, db, 'fee_structures', 'tax_amount',
    'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER tax_pct');

  // Which installment a payment settled — without this a receipt cannot be
  // traced back to the due it cleared.
  await ensureColumn(conn, db, 'fee_transactions', 'installment_id',
    'INT UNSIGNED NULL AFTER student_id');
  await ensureColumn(conn, db, 'fee_transactions', 'collected_by',
    'INT UNSIGNED NULL AFTER remarks');

  // ---- Parent/guardian alerts need somewhere to send to --------------------
  await ensureColumn(conn, db, 'students', 'guardian_email',
    'VARCHAR(160) NULL AFTER guardian_phone');

  await addIndex('fee_installments', 'idx_inst_student_status', '`student_id`, `status`');

  // ---- TSP: employability is DERIVED, never typed in --------------------
  // The one status a human sets directly is 'blocked'. Everything else is the
  // output of EmployabilityService, so these columns record what the engine
  // decided and why — a status with no reason is impossible to argue with.
  await ensureColumn(conn, db, 'students', 'employability',
    "ENUM('unskilled','in_training','remedial_required','job_ready','placed','blocked') " +
    "NOT NULL DEFAULT 'in_training' AFTER risk_updated_at");
  await ensureColumn(conn, db, 'students', 'employability_reason', 'VARCHAR(300) NULL AFTER employability');
  await ensureColumn(conn, db, 'students', 'employability_updated_at', 'DATETIME NULL AFTER employability_reason');

  // The trainer's manual sign-off — one of the three Job-Ready conditions.
  await ensureColumn(conn, db, 'students', 'soft_skill_cleared',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER employability_updated_at');
  await ensureColumn(conn, db, 'students', 'soft_skill_cleared_by', 'INT UNSIGNED NULL AFTER soft_skill_cleared');
  await ensureColumn(conn, db, 'students', 'soft_skill_cleared_at', 'DATETIME NULL AFTER soft_skill_cleared_by');
  await addIndex('students', 'idx_students_employability', '`employability`');

  // ---- TSP: a job posting has to carry its own eligibility bar -----------
  // `eligibility` was free text, so nothing could act on it.
  await ensureColumn(conn, db, 'placement_jobs', 'partner_id', 'INT UNSIGNED NULL AFTER company');
  await ensureColumn(conn, db, 'placement_jobs', 'jd', 'TEXT NULL AFTER eligibility');
  await ensureColumn(conn, db, 'placement_jobs', 'hr_name', 'VARCHAR(120) NULL AFTER jd');
  await ensureColumn(conn, db, 'placement_jobs', 'hr_email', 'VARCHAR(160) NULL AFTER hr_name');
  await ensureColumn(conn, db, 'placement_jobs', 'hr_phone', 'VARCHAR(20) NULL AFTER hr_email');
  await ensureColumn(conn, db, 'placement_jobs', 'openings', 'SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER hr_phone');
  await ensureColumn(conn, db, 'placement_jobs', 'min_attendance_pct',
    'TINYINT UNSIGNED NOT NULL DEFAULT 85 AFTER openings');
  await ensureColumn(conn, db, 'placement_jobs', 'min_score_pct',
    'TINYINT UNSIGNED NOT NULL DEFAULT 75 AFTER min_attendance_pct');
  await ensureColumn(conn, db, 'placement_jobs', 'require_job_ready',
    'TINYINT(1) NOT NULL DEFAULT 1 AFTER min_score_pct');
  await ensureColumn(conn, db, 'placement_jobs', 'closes_on', 'DATE NULL AFTER require_job_ready');

  // ---- TSP: the real application pipeline --------------------------------
  // 4 states could not express "cleared our screening but failed client round 2".
  const [appCol] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'placement_applications' AND COLUMN_NAME = 'status'`, [db]
  );
  if (appCol.length && !appCol[0].COLUMN_TYPE.includes('internal_screening_passed')) {
    await conn.query(
      `ALTER TABLE placement_applications MODIFY COLUMN status
       ENUM('applied','shortlisted','internal_screening_passed','client_round_1','client_round_2',
            'offered','placed','rejected','withdrawn')
       NOT NULL DEFAULT 'applied'`
    );
    console.log('[db:setup] placement_applications.status extended (full pipeline).');
  }
  await ensureColumn(conn, db, 'placement_applications', 'match_score',
    'TINYINT UNSIGNED NULL AFTER status');          // why this candidate was put forward
  await ensureColumn(conn, db, 'placement_applications', 'rejection_reason',
    'VARCHAR(500) NULL AFTER match_score');
  await ensureColumn(conn, db, 'placement_applications', 'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // ---- Attendance: distinguish a trainer's mark from a student's check-in --
  // Without this you cannot tell "the trainer marked her present" from "she
  // checked herself in with the class code" — which matters the day someone
  // disputes a record.
  await ensureColumn(conn, db, 'attendance', 'source',
    "ENUM('trainer','self') NOT NULL DEFAULT 'trainer' AFTER marked_by");

  // ---- Classwork/homework: a PRECISE deadline, not just a date -------------
  // `due_date` is a DATE, so "due today" gives a student until 23:59 no matter
  // when it was set. A 30-minute in-class task needs a real timestamp. due_at
  // is the authoritative deadline; the app computes done / missing against it.
  await ensureColumn(conn, db, 'course_materials', 'due_at', 'DATETIME NULL AFTER due_date');
  // Backfill existing rows so nothing created before this migration is left
  // without a deadline: end-of-day on the old due_date.
  await conn.query(
    "UPDATE course_materials SET due_at = TIMESTAMP(due_date, '23:59:59') WHERE due_at IS NULL AND due_date IS NOT NULL"
  );
}

module.exports = { runMigrations, ensureColumn, columnExists };

-- ===========================================================================
--  Envision ERP — Database Schema (MySQL 8, InnoDB, utf8mb4)
--
--  Apply with:
--    cd server && npm run db:setup      (also seeds a default admin)
--  or:
--    mysql -u root -p < database/envision_erp.sql
--
--  Tables are ordered so foreign-key targets are created first.
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS `envision_erp`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `envision_erp`;

-- ---------------------------------------------------------------------------
--  users — identity & access (Auth / Users module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(120) NOT NULL,
  `email`               VARCHAR(160) NOT NULL,
  `password`            VARCHAR(255) NOT NULL,
  `role`                ENUM('super_admin','admin','faculty','staff','student') NOT NULL DEFAULT 'staff',
  `phone`               VARCHAR(20)  DEFAULT NULL,
  `avatar`              VARCHAR(255) DEFAULT NULL,
  `status`              ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `last_login_at`       DATETIME     DEFAULT NULL,
  `reset_token`         VARCHAR(255) DEFAULT NULL,
  `reset_token_expires` DATETIME     DEFAULT NULL,
  `created_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  RBAC — roles, permissions, role_permissions
--  Roles and permissions are DATA, not hard-coded enums. Permissions are
--  generated as `<module>.<action>` and mapped to roles by `npm run db:setup`.
--  `users.role_id` is added/backfilled by config/seedRbac.js.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(50)  NOT NULL,
  `label`       VARCHAR(80)  NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_system`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`    VARCHAR(80)  NOT NULL,   -- e.g. 'students.create'
  `module`  VARCHAR(50)  NOT NULL,   -- e.g. 'students'
  `action`  VARCHAR(30)  NOT NULL,   -- e.g. 'create'
  `label`   VARCHAR(120) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_name` (`name`),
  KEY `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_role`       FOREIGN KEY (`role_id`)       REFERENCES `roles` (`id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  courses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `courses` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(40)  NOT NULL,
  `title`       VARCHAR(180) NOT NULL,
  `credits`     INT          DEFAULT 0,
  `department`  VARCHAR(120) DEFAULT NULL,
  `duration`    VARCHAR(60)  DEFAULT NULL,
  `fee`         DECIMAL(12,2) DEFAULT 0.00,
  `description` TEXT         DEFAULT NULL,
  `status`      ENUM('active','archived') NOT NULL DEFAULT 'active',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  faculty
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `faculty` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_no`    VARCHAR(40)  DEFAULT NULL,
  `name`           VARCHAR(120) NOT NULL,
  `email`          VARCHAR(160) DEFAULT NULL,
  `phone`          VARCHAR(20)  DEFAULT NULL,
  `department`     VARCHAR(120) DEFAULT NULL,
  `specialization` VARCHAR(160) DEFAULT NULL,
  `qualification`  VARCHAR(160) DEFAULT NULL,
  `avatar`         VARCHAR(255) DEFAULT NULL,
  `status`         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `joined_at`      DATE         DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_faculty_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  staff
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `staff` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_no` VARCHAR(40)  DEFAULT NULL,
  `name`        VARCHAR(120) NOT NULL,
  `email`       VARCHAR(160) DEFAULT NULL,
  `phone`       VARCHAR(20)  DEFAULT NULL,
  `department`  VARCHAR(120) DEFAULT NULL,
  `designation` VARCHAR(120) DEFAULT NULL,
  `permissions` JSON         DEFAULT NULL,
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `batches` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(40)  NOT NULL,
  `name`       VARCHAR(160) NOT NULL,
  `course_id`  INT UNSIGNED DEFAULT NULL,
  `faculty_id` INT UNSIGNED DEFAULT NULL,
  `timeline`   VARCHAR(120) DEFAULT NULL,
  `start_date` DATE         DEFAULT NULL,
  `end_date`   DATE         DEFAULT NULL,
  `capacity`   INT          DEFAULT 0,
  `status`     ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batches_code` (`code`),
  KEY `fk_batches_course` (`course_id`),
  KEY `fk_batches_faculty` (`faculty_id`),
  CONSTRAINT `fk_batches_course`  FOREIGN KEY (`course_id`)  REFERENCES `courses` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_batches_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  students
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admission_no`   VARCHAR(40)  DEFAULT NULL,
  `name`           VARCHAR(120) NOT NULL,
  `email`          VARCHAR(160) DEFAULT NULL,
  `phone`          VARCHAR(20)  DEFAULT NULL,
  `dob`            DATE         DEFAULT NULL,
  `gender`         ENUM('male','female','other') DEFAULT NULL,
  `address`        VARCHAR(255) DEFAULT NULL,
  `course_id`      INT UNSIGNED DEFAULT NULL,
  `batch_id`       INT UNSIGNED DEFAULT NULL,
  `avatar`         VARCHAR(255) DEFAULT NULL,
  `status`         ENUM('active','inactive','graduated','dropped') NOT NULL DEFAULT 'active',
  `admission_date` DATE         DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_students_admission_no` (`admission_no`),
  KEY `fk_students_course` (`course_id`),
  KEY `fk_students_batch` (`batch_id`),
  CONSTRAINT `fk_students_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_students_batch`  FOREIGN KEY (`batch_id`)  REFERENCES `batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Student lifecycle — enrollments, documents, status history, ID sequences
-- ---------------------------------------------------------------------------

-- A student may hold several concurrent enrollments (different courses), which
-- is exactly why timetable-overlap validation is required on assignment.
CREATE TABLE IF NOT EXISTS `student_batches` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `batch_id`     INT UNSIGNED NOT NULL,
  `enrolled_on`  DATE NOT NULL,
  `completed_on` DATE DEFAULT NULL,
  `status`       ENUM('enrolled','completed','dropped','transferred') NOT NULL DEFAULT 'enrolled',
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_batch` (`student_id`, `batch_id`),
  KEY `idx_sb_batch` (`batch_id`),
  KEY `idx_sb_status` (`status`),
  CONSTRAINT `fk_sb_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sb_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_documents` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`  INT UNSIGNED NOT NULL,
  `doc_type`    ENUM('id_proof','photo','address_proof','marksheet','certificate','other')
                  NOT NULL DEFAULT 'other',
  `file_name`   VARCHAR(255) NOT NULL,
  `file_url`    VARCHAR(255) NOT NULL,
  `mime_type`   VARCHAR(100) DEFAULT NULL,
  `size_kb`     INT DEFAULT 0,
  `verified`    TINYINT(1) NOT NULL DEFAULT 0,
  `verified_by` INT UNSIGNED DEFAULT NULL,
  `verified_at` DATETIME DEFAULT NULL,
  `uploaded_by` INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sd_student_type` (`student_id`, `doc_type`),
  CONSTRAINT `fk_sd_student`  FOREIGN KEY (`student_id`)  REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sd_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)    ON DELETE SET NULL,
  CONSTRAINT `fk_sd_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only lifecycle trail: Active -> Completed / Drop-out / ...
CREATE TABLE IF NOT EXISTS `student_status_history` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`  INT UNSIGNED NOT NULL,
  `from_status` VARCHAR(20) DEFAULT NULL,
  `to_status`   VARCHAR(20) NOT NULL,
  `reason`      VARCHAR(255) DEFAULT NULL,
  `changed_by`  INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ssh_student` (`student_id`, `created_at`),
  CONSTRAINT `fk_ssh_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssh_user`    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gap-free counters for human-readable IDs (locked with SELECT ... FOR UPDATE).
CREATE TABLE IF NOT EXISTS `id_sequences` (
  `scope`      VARCHAR(80) NOT NULL,
  `next_val`   INT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  admissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admissions` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(120) NOT NULL,
  `email`          VARCHAR(160) DEFAULT NULL,
  `phone`          VARCHAR(20)  DEFAULT NULL,
  `course_id`      INT UNSIGNED DEFAULT NULL,
  `batch_id`       INT UNSIGNED DEFAULT NULL,
  `status`         ENUM('pending','verified','approved','rejected') NOT NULL DEFAULT 'pending',
  `docs_verified`  TINYINT(1)   NOT NULL DEFAULT 0,
  `remarks`        VARCHAR(255) DEFAULT NULL,
  `student_id`     INT UNSIGNED DEFAULT NULL,
  `applied_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_adm_course` (`course_id`),
  CONSTRAINT `fk_adm_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  enquiries + followups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(120) NOT NULL,
  `email`           VARCHAR(160) DEFAULT NULL,
  `phone`           VARCHAR(20)  DEFAULT NULL,
  `course_interest` VARCHAR(160) DEFAULT NULL,
  `source`          VARCHAR(80)  DEFAULT NULL,
  `status`          ENUM('new','contacted','converted','closed') NOT NULL DEFAULT 'new',
  `assigned_to`     INT UNSIGNED DEFAULT NULL,
  `notes`           TEXT         DEFAULT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `followups` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enquiry_id`         INT UNSIGNED NOT NULL,
  `note`               TEXT         DEFAULT NULL,
  `followup_date`      DATE         DEFAULT NULL,
  `next_followup_date` DATE         DEFAULT NULL,
  `status`             ENUM('pending','done') NOT NULL DEFAULT 'pending',
  `created_by`         INT UNSIGNED DEFAULT NULL,
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_followups_enquiry` (`enquiry_id`),
  CONSTRAINT `fk_followups_enquiry` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  fees
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fee_structures` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount`     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fee_structure_student` (`student_id`),
  CONSTRAINT `fk_feestruct_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fee_transactions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `amount`       DECIMAL(12,2) NOT NULL,
  `mode`         ENUM('cash','card','upi','bank','cheque') NOT NULL DEFAULT 'cash',
  `reference_no` VARCHAR(80)  DEFAULT NULL,
  `receipt_no`   VARCHAR(40)  DEFAULT NULL,
  `remarks`      VARCHAR(255) DEFAULT NULL,
  `paid_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fee_receipt` (`receipt_no`),
  KEY `fk_feetx_student` (`student_id`),
  CONSTRAINT `fk_feetx_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`   INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `date`       DATE NOT NULL,
  `status`     ENUM('present','absent','late','leave') NOT NULL DEFAULT 'present',
  `marked_by`  INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance` (`batch_id`, `student_id`, `date`),
  KEY `fk_att_student` (`student_id`),
  CONSTRAINT `fk_att_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_att_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  exams + marks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `exams` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`         VARCHAR(180) NOT NULL,
  `batch_id`      INT UNSIGNED DEFAULT NULL,
  `course_id`     INT UNSIGNED DEFAULT NULL,
  `exam_date`     DATE         DEFAULT NULL,
  `total_marks`   INT          DEFAULT 100,
  `passing_marks` INT          DEFAULT 40,
  `type`          VARCHAR(60)  DEFAULT 'written',
  `status`        ENUM('scheduled','ongoing','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_exams_batch` (`batch_id`),
  CONSTRAINT `fk_exams_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marks` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id`        INT UNSIGNED NOT NULL,
  `student_id`     INT UNSIGNED NOT NULL,
  `marks_obtained` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `grade`          VARCHAR(5)   DEFAULT NULL,
  `remarks`        VARCHAR(160) DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_marks` (`exam_id`, `student_id`),
  KEY `fk_marks_student` (`student_id`),
  CONSTRAINT `fk_marks_exam`    FOREIGN KEY (`exam_id`)    REFERENCES `exams` (`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_marks_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Instructor portal — course materials & daily class logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `course_materials` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`   INT UNSIGNED DEFAULT NULL,
  `course_id`  INT UNSIGNED DEFAULT NULL,
  `faculty_id` INT UNSIGNED DEFAULT NULL,
  `title`      VARCHAR(180) NOT NULL,
  `type`       ENUM('material','assignment','lab') NOT NULL DEFAULT 'material',
  `file_name`  VARCHAR(255) NOT NULL,
  `file_url`   VARCHAR(255) NOT NULL,
  `mime_type`  VARCHAR(100) DEFAULT NULL,
  `size_kb`    INT DEFAULT 0,
  `due_date`   DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cm_batch` (`batch_id`, `type`),
  CONSTRAINT `fk_cm_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cm_course`  FOREIGN KEY (`course_id`)  REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cm_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One log per batch per day (upsert on re-save).
CREATE TABLE IF NOT EXISTS `class_logs` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`       INT UNSIGNED NOT NULL,
  `faculty_id`     INT UNSIGNED DEFAULT NULL,
  `date`           DATE NOT NULL,
  `topics_covered` TEXT NOT NULL,
  `remarks`        VARCHAR(500) DEFAULT NULL,
  `duration_min`   INT DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_class_log` (`batch_id`, `date`),
  KEY `idx_cl_faculty` (`faculty_id`, `date`),
  CONSTRAINT `fk_cl_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cl_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Student submissions (classwork / homework / projects)
--  One row per (assignment, student) — a resubmission UPDATEs, never duplicates.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `material_id`  INT UNSIGNED NOT NULL,
  `student_id`   INT UNSIGNED NOT NULL,
  `note`         TEXT DEFAULT NULL,
  `file_name`    VARCHAR(255) DEFAULT NULL,
  `file_url`     VARCHAR(255) DEFAULT NULL,
  `mime_type`    VARCHAR(120) DEFAULT NULL,
  `size_kb`      INT DEFAULT 0,
  `status`       ENUM('submitted','late','graded','returned') NOT NULL DEFAULT 'submitted',
  `grade`        VARCHAR(10)  DEFAULT NULL,
  `feedback`     VARCHAR(500) DEFAULT NULL,
  `graded_by`    INT UNSIGNED DEFAULT NULL,
  `graded_at`    DATETIME DEFAULT NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_submission` (`material_id`, `student_id`),
  KEY `idx_sub_student` (`student_id`),
  CONSTRAINT `fk_sub_material` FOREIGN KEY (`material_id`) REFERENCES `course_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sub_student`  FOREIGN KEY (`student_id`)  REFERENCES `students` (`id`)         ON DELETE CASCADE,
  CONSTRAINT `fk_sub_grader`   FOREIGN KEY (`graded_by`)   REFERENCES `users` (`id`)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  OTP verification (email) — codes are stored HASHED, never in plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `otp_verifications` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`       VARCHAR(160) NOT NULL,
  `purpose`     ENUM('register','login','reset') NOT NULL DEFAULT 'register',
  `code_hash`   CHAR(64) NOT NULL,
  `expires_at`  DATETIME NOT NULL,
  `attempts`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `consumed_at` DATETIME DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_lookup` (`email`, `purpose`, `consumed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Trainer / Faculty module
--  Row-level security is enforced in the service layer: every query below is
--  reachable only through a batch whose `faculty_id` matches the logged-in
--  trainer. Nothing here is queryable by batch_id alone.
-- ---------------------------------------------------------------------------

-- Master curriculum for a course (the trainer's read-only checklist).
CREATE TABLE IF NOT EXISTS `course_syllabus` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id`   INT UNSIGNED NOT NULL,
  `seq`         SMALLINT UNSIGNED NOT NULL,
  `topic`       VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `hours`       DECIMAL(4,1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_syllabus_seq` (`course_id`, `seq`),
  CONSTRAINT `fk_syl_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-batch progress against that curriculum ("where did I leave off?").
CREATE TABLE IF NOT EXISTS `topic_progress` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`    INT UNSIGNED NOT NULL,
  `syllabus_id` INT UNSIGNED NOT NULL,
  `faculty_id`  INT UNSIGNED DEFAULT NULL,
  `status`      ENUM('pending','in_progress','covered') NOT NULL DEFAULT 'pending',
  `covered_on`  DATE DEFAULT NULL,
  `notes`       VARCHAR(500) DEFAULT NULL,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_topic_progress` (`batch_id`, `syllabus_id`),
  CONSTRAINT `fk_tp_batch`    FOREIGN KEY (`batch_id`)    REFERENCES `batches` (`id`)         ON DELETE CASCADE,
  CONSTRAINT `fk_tp_syllabus` FOREIGN KEY (`syllabus_id`) REFERENCES `course_syllabus` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_faculty`  FOREIGN KEY (`faculty_id`)  REFERENCES `faculty` (`id`)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Continuous evaluation: exams, practicals, projects, mock interviews.
CREATE TABLE IF NOT EXISTS `student_grades` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`      INT UNSIGNED NOT NULL,
  `batch_id`        INT UNSIGNED NOT NULL,
  `assessment_type` ENUM('exam','theory','practical','project','mock_interview','assignment') NOT NULL,
  `title`           VARCHAR(160) NOT NULL,
  `max_marks`       DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  `marks_obtained`  DECIMAL(6,2) NOT NULL,
  `grade`           VARCHAR(5) DEFAULT NULL,
  `feedback`        VARCHAR(500) DEFAULT NULL,
  `is_final`        TINYINT(1) NOT NULL DEFAULT 0,
  `graded_by`       INT UNSIGNED DEFAULT NULL,
  `graded_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grade` (`student_id`, `batch_id`, `assessment_type`, `title`),
  KEY `idx_grade_batch` (`batch_id`),
  CONSTRAINT `fk_grade_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_grade_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_grade_user`    FOREIGN KEY (`graded_by`)  REFERENCES `users` (`id`)    ON DELETE SET NULL,
  CONSTRAINT `ck_grade_marks` CHECK (`marks_obtained` >= 0 AND `marks_obtained` <= `max_marks`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Slow-learner flags raised by a trainer; routed to counselor/admin.
CREATE TABLE IF NOT EXISTS `student_flags` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`  INT UNSIGNED NOT NULL,
  `batch_id`    INT UNSIGNED NOT NULL,
  `faculty_id`  INT UNSIGNED DEFAULT NULL,
  `reason`      ENUM('low_attendance','failing_grades','misconduct','other') NOT NULL,
  `note`        VARCHAR(500) DEFAULT NULL,
  `metric`      VARCHAR(60) DEFAULT NULL,      -- e.g. 'attendance=62%'
  `status`      ENUM('open','resolved') NOT NULL DEFAULT 'open',
  `resolved_by` INT UNSIGNED DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_flag_status` (`status`, `created_at`),
  CONSTRAINT `fk_flag_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_flag_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_flag_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_flag_user`    FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Batch Shifting Engine: an auditable trail of every student transfer.
-- Attendance rows keep their ORIGINAL batch_id, so history is preserved.
CREATE TABLE IF NOT EXISTS `batch_transfers` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`     INT UNSIGNED NOT NULL,
  `from_batch_id`  INT UNSIGNED NOT NULL,
  `to_batch_id`    INT UNSIGNED NOT NULL,
  `reason`         VARCHAR(255) DEFAULT NULL,
  `transferred_by` INT UNSIGNED DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bt_student` (`student_id`, `created_at`),
  CONSTRAINT `fk_bt_student` FOREIGN KEY (`student_id`)     REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bt_from`    FOREIGN KEY (`from_batch_id`)  REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_bt_to`      FOREIGN KEY (`to_batch_id`)    REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_bt_user`    FOREIGN KEY (`transferred_by`) REFERENCES `users` (`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  Admin / CEO command center
-- ---------------------------------------------------------------------------

-- Physical rooms & labs a batch can be scheduled into.
CREATE TABLE IF NOT EXISTS `classrooms` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`     VARCHAR(20)  NOT NULL,
  `name`     VARCHAR(120) NOT NULL,
  `type`     ENUM('classroom','lab') NOT NULL DEFAULT 'classroom',
  `capacity` INT UNSIGNED NOT NULL DEFAULT 0,
  `location` VARCHAR(120) DEFAULT NULL,
  `status`   ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_classroom_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*
 * trainer_feedback — ANONYMOUS student ratings of a trainer.
 *
 * `student_id` exists ONLY to enforce one-response-per-cycle. It is never
 * selected by any admin/trainer endpoint; the API returns aggregates and free
 * text only. Anonymity is an application invariant, so keep it that way:
 * never add student_id to a SELECT in FeedbackController.
 */
CREATE TABLE IF NOT EXISTS `trainer_feedback` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `faculty_id`       INT UNSIGNED NOT NULL,
  `batch_id`         INT UNSIGNED NOT NULL,
  `student_id`       INT UNSIGNED NOT NULL,
  `cycle`            CHAR(7) NOT NULL,                 -- 'YYYY-MM' feedback window
  `clarity`          TINYINT UNSIGNED NOT NULL,
  `punctuality`      TINYINT UNSIGNED NOT NULL,
  `lab_support`      TINYINT UNSIGNED NOT NULL,
  `doubt_resolution` TINYINT UNSIGNED NOT NULL,
  `overall`          DECIMAL(3,2) AS
      ((`clarity` + `punctuality` + `lab_support` + `doubt_resolution`) / 4) STORED,
  `comments`         TEXT DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feedback_once` (`student_id`, `faculty_id`, `batch_id`, `cycle`),
  KEY `idx_fb_faculty` (`faculty_id`, `cycle`),
  CONSTRAINT `fk_fb_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_fb_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_fb_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_fb_range` CHECK (
    `clarity` BETWEEN 1 AND 5 AND `punctuality` BETWEEN 1 AND 5 AND
    `lab_support` BETWEEN 1 AND 5 AND `doubt_resolution` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trainer leave requests, approved/rejected by the admin.
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `faculty_id` INT UNSIGNED NOT NULL,
  `from_date`  DATE NOT NULL,
  `to_date`    DATE NOT NULL,
  `reason`     VARCHAR(500) DEFAULT NULL,
  `status`     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `decided_by` INT UNSIGNED DEFAULT NULL,
  `decided_at` DATETIME DEFAULT NULL,
  `remarks`    VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_faculty` (`faculty_id`, `status`),
  CONSTRAINT `fk_leave_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_user`    FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`)   ON DELETE SET NULL,
  CONSTRAINT `ck_leave_range` CHECK (`to_date` >= `from_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit of every automated/manual email the ERP sends.
CREATE TABLE IF NOT EXISTS `email_logs` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template`       VARCHAR(60) NOT NULL,
  `recipient_type` ENUM('student','trainer','staff','other') NOT NULL DEFAULT 'other',
  `recipient_id`   INT UNSIGNED DEFAULT NULL,
  `recipient_email` VARCHAR(160) NOT NULL,
  `subject`        VARCHAR(200) NOT NULL,
  `status`         ENUM('sent','logged','failed') NOT NULL DEFAULT 'logged',
  `error`          VARCHAR(255) DEFAULT NULL,
  `meta`           JSON DEFAULT NULL,
  `triggered_by`   INT UNSIGNED DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_template_time` (`template`, `created_at`),
  KEY `idx_email_recipient` (`recipient_type`, `recipient_id`),
  CONSTRAINT `fk_email_user` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  certificates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `certificate_templates` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(160) NOT NULL,
  `type`        VARCHAR(80)  DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `certificates_issued` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `certificate_number` VARCHAR(60)  NOT NULL,
  `student_id`         INT UNSIGNED DEFAULT NULL,
  `template_id`        INT UNSIGNED DEFAULT NULL,
  `issued_date`        DATE         DEFAULT NULL,
  `status`             ENUM('issued','revoked') NOT NULL DEFAULT 'issued',
  `remarks`            VARCHAR(255) DEFAULT NULL,
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cert_number` (`certificate_number`),
  KEY `fk_cert_student` (`student_id`),
  CONSTRAINT `fk_cert_student`  FOREIGN KEY (`student_id`)  REFERENCES `students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cert_template` FOREIGN KEY (`template_id`) REFERENCES `certificate_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  placements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `placement_jobs` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company`     VARCHAR(160) NOT NULL,
  `role`        VARCHAR(160) NOT NULL,
  `package`     VARCHAR(80)  DEFAULT NULL,
  `location`    VARCHAR(120) DEFAULT NULL,
  `eligibility` VARCHAR(255) DEFAULT NULL,
  `status`      ENUM('open','closed') NOT NULL DEFAULT 'open',
  `posted_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `placement_applications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id`     INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `status`     ENUM('applied','shortlisted','placed','rejected') NOT NULL DEFAULT 'applied',
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_placement_app` (`job_id`, `student_id`),
  KEY `fk_papp_student` (`student_id`),
  CONSTRAINT `fk_papp_job`     FOREIGN KEY (`job_id`)     REFERENCES `placement_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_papp_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  library
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `library_books` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `isbn`             VARCHAR(40)  DEFAULT NULL,
  `title`            VARCHAR(200) NOT NULL,
  `author`           VARCHAR(160) DEFAULT NULL,
  `category`         VARCHAR(100) DEFAULT NULL,
  `total_copies`     INT NOT NULL DEFAULT 1,
  `available_copies` INT NOT NULL DEFAULT 1,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_books_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `library_issues` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `book_id`     INT UNSIGNED NOT NULL,
  `student_id`  INT UNSIGNED NOT NULL,
  `issued_date` DATE DEFAULT NULL,
  `due_date`    DATE DEFAULT NULL,
  `return_date` DATE DEFAULT NULL,
  `status`      ENUM('issued','returned','overdue') NOT NULL DEFAULT 'issued',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_libissue_book` (`book_id`),
  KEY `fk_libissue_student` (`student_id`),
  CONSTRAINT `fk_libissue_book`    FOREIGN KEY (`book_id`)    REFERENCES `library_books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_libissue_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  inventory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_suppliers` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(160) NOT NULL,
  `contact`    VARCHAR(120) DEFAULT NULL,
  `email`      VARCHAR(160) DEFAULT NULL,
  `phone`      VARCHAR(20)  DEFAULT NULL,
  `address`    VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(160) NOT NULL,
  `sku`           VARCHAR(60)  DEFAULT NULL,
  `category`      VARCHAR(100) DEFAULT NULL,
  `quantity`      INT NOT NULL DEFAULT 0,
  `unit`          VARCHAR(40)  DEFAULT 'unit',
  `reorder_level` INT NOT NULL DEFAULT 0,
  `supplier_id`   INT UNSIGNED DEFAULT NULL,
  `status`        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inv_sku` (`sku`),
  KEY `fk_inv_supplier` (`supplier_id`),
  CONSTRAINT `fk_inv_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `inventory_suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_id`    INT UNSIGNED NOT NULL,
  `type`       ENUM('in','out') NOT NULL,
  `quantity`   INT NOT NULL,
  `note`       VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_invtx_item` (`item_id`),
  CONSTRAINT `fk_invtx_item` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  settings + backups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `institution_settings` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(200) DEFAULT 'Envision Institute',
  `legal_name`      VARCHAR(200) DEFAULT NULL,
  `tagline`         VARCHAR(160) DEFAULT NULL,
  `registration_no` VARCHAR(60)  DEFAULT NULL,
  `affiliation`     VARCHAR(200) DEFAULT NULL,
  `address`         VARCHAR(255) DEFAULT NULL,
  `city`            VARCHAR(80)  DEFAULT NULL,
  `state`           VARCHAR(80)  DEFAULT NULL,
  `pincode`         VARCHAR(10)  DEFAULT NULL,
  `phone`           VARCHAR(20)  DEFAULT NULL,
  `email`           VARCHAR(160) DEFAULT NULL,
  `website`         VARCHAR(160) DEFAULT NULL,
  `gstin`           VARCHAR(20)  DEFAULT NULL,
  `pan`             VARCHAR(15)  DEFAULT NULL,
  `logo`            VARCHAR(255) DEFAULT NULL,
  `academic_year`   VARCHAR(20)  DEFAULT NULL,
  `currency`        VARCHAR(10)  DEFAULT 'INR',
  `timezone`        VARCHAR(60)  DEFAULT 'Asia/Kolkata',
  -- printed on fee receipts and invoices
  `bank_name`       VARCHAR(120) DEFAULT NULL,
  `bank_branch`     VARCHAR(120) DEFAULT NULL,
  `account_holder`  VARCHAR(160) DEFAULT NULL,
  `account_no`      VARCHAR(40)  DEFAULT NULL,
  `ifsc`            VARCHAR(20)  DEFAULT NULL,
  `upi_id`          VARCHAR(80)  DEFAULT NULL,
  `signatory_name`  VARCHAR(120) DEFAULT NULL,
  `signatory_role`  VARCHAR(80)  DEFAULT NULL,
  `receipt_terms`   TEXT         DEFAULT NULL,
  `certificate_note` TEXT        DEFAULT NULL,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filename`   VARCHAR(200) NOT NULL,
  `size_kb`    INT DEFAULT 0,
  `status`     ENUM('success','failed') NOT NULL DEFAULT 'success',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per document type per academic year: what the next admission,
-- receipt or certificate number reads. Unique on (doc_type, fy) so a new year
-- starts a fresh series without disturbing the old one.
CREATE TABLE IF NOT EXISTS `numbering_series` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `doc_type`    VARCHAR(40) NOT NULL,
  `fy`          VARCHAR(20) NOT NULL,
  `prefix`      VARCHAR(30) NOT NULL DEFAULT '',
  `suffix`      VARCHAR(30) DEFAULT NULL,
  `next_number` INT UNSIGNED NOT NULL DEFAULT 1,
  `padding`     TINYINT UNSIGNED NOT NULL DEFAULT 4,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_numbering_doc_fy` (`doc_type`, `fy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  notifications — per-user real-time notifications (Socket.IO)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'info',
  `title`      VARCHAR(180) NOT NULL,
  `message`    VARCHAR(500) DEFAULT NULL,
  `link`       VARCHAR(255) DEFAULT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  DOCUMENT VAULT — private per-user folders/files with explicit sharing.
--
--  Ownership is the security boundary: every folder and file belongs to exactly
--  one user (`user_id`). Nobody else sees it unless a row in `document_shares`
--  grants access, or the viewer is an admin.
--
--  Deletes are SOFT (`is_deleted`) so a folder's children survive and a restore
--  is possible; the physical file on disk is only removed on hard purge.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `document_folders` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,                 -- owner
  `parent_id`  INT UNSIGNED DEFAULT NULL,             -- NULL = vault root
  `name`       VARCHAR(255) NOT NULL,
  `is_system`  TINYINT(1)   NOT NULL DEFAULT 0,       -- auto-managed: no rename/delete
  `is_deleted` TINYINT(1)   NOT NULL DEFAULT 0,
  `deleted_at` DATETIME     DEFAULT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_folder_owner_parent` (`user_id`, `parent_id`),
  KEY `idx_folder_owner_live` (`user_id`, `is_deleted`),
  CONSTRAINT `fk_folder_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_files` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,                -- owner
  `folder_id`   INT UNSIGNED DEFAULT NULL,            -- NULL = vault root
  `name`        VARCHAR(300) NOT NULL,                -- display name (renameable)
  `file_name`   VARCHAR(255) NOT NULL,                -- original upload name
  `stored_name` VARCHAR(255) NOT NULL,                -- on-disk name (unguessable)
  `file_path`   VARCHAR(512) NOT NULL,                -- /uploads/documents/<stored>
  `file_size`   BIGINT UNSIGNED DEFAULT NULL,
  `mime_type`   VARCHAR(150) DEFAULT NULL,
  `ext`         VARCHAR(20)  DEFAULT NULL,            -- lower-case, no dot
  `tags`        JSON         DEFAULT NULL,            -- ["Fees","Circular",...]
  `is_deleted`  TINYINT(1)   NOT NULL DEFAULT 0,
  `deleted_at`  DATETIME     DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_file_owner_folder` (`user_id`, `folder_id`),
  KEY `idx_file_owner_live` (`user_id`, `is_deleted`),
  KEY `idx_file_created` (`created_at`),
  CONSTRAINT `fk_file_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_file_folder` FOREIGN KEY (`folder_id`) REFERENCES `document_folders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_shares` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`         INT UNSIGNED NOT NULL,           -- who shared it
  `shared_with_user_id` INT UNSIGNED NOT NULL,        -- recipient
  `item_type`        ENUM('folder','file') NOT NULL,
  `item_id`          INT UNSIGNED NOT NULL,           -- folder.id or file.id
  `access_level`     ENUM('view','download') NOT NULL DEFAULT 'view',
  `expires_at`       DATETIME     DEFAULT NULL,       -- NULL = never expires
  `is_revoked`       TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_share_recipient` (`shared_with_user_id`, `is_revoked`),
  KEY `idx_share_owner` (`owner_id`, `is_revoked`),
  KEY `idx_share_item` (`item_type`, `item_id`),
  CONSTRAINT `fk_share_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_share_target` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  CORPORATE PARTNERS — the companies the institute does business with:
--  they sponsor corporate training batches (so they need GST-compliant
--  invoices) and they hire our students.
--
--  Deletes are SOFT so a partner with historic invoices or placements is never
--  lost; the list has a "Deleted" view to see and restore them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partners` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(180) NOT NULL,
  `partner_type`  ENUM('hiring','training','both') NOT NULL DEFAULT 'both',
  `pan`           VARCHAR(10)  DEFAULT NULL,          -- ABCDE1234F
  `gst`           VARCHAR(15)  DEFAULT NULL,          -- 27ABCDE1234F1Z5
  `corp_city`     VARCHAR(120) DEFAULT NULL,
  `corp_state`    VARCHAR(120) DEFAULT NULL,
  `corp_address`  VARCHAR(400) DEFAULT NULL,
  `venue_address` VARCHAR(400) DEFAULT NULL,          -- where on-site training runs
  `website`       VARCHAR(180) DEFAULT NULL,
  `notes`         VARCHAR(500) DEFAULT NULL,
  `is_deleted`    TINYINT(1)   NOT NULL DEFAULT 0,
  `deleted_at`    DATETIME     DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_partner_gst` (`gst`),
  KEY `idx_partner_live` (`is_deleted`),
  KEY `idx_partner_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_contacts` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id`  INT UNSIGNED NOT NULL,
  `name`        VARCHAR(120) NOT NULL,
  `designation` VARCHAR(120) DEFAULT NULL,            -- HR Manager, L&D Head…
  `phone`       VARCHAR(20)  DEFAULT NULL,
  `email`       VARCHAR(160) DEFAULT NULL,
  `is_primary`  TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pcontact_partner` (`partner_id`),
  CONSTRAINT `fk_pcontact_partner` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  FINANCE — fee plans, installment schedules, fines, expenses.
--
--    fee_plans        : the TEMPLATE (per course). Base + registration + tax,
--                       and how many installments it splits into.
--    fee_structures   : the per-student instance (already existed) — now carries
--                       the plan it came from and the frozen tax/registration.
--    fee_installments : the generated SCHEDULE — one row per due date. This is
--                       what makes "overdue" and "pending dues" answerable.
--    fee_fines        : late fees raised against an overdue installment.
--    expenses         : the cost side (rent, utilities, payouts, marketing).
--
--  Money is always DECIMAL(12,2) — never FLOAT. A rupee must not drift.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fee_plans` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(160)  NOT NULL,
  `course_id`        INT UNSIGNED  DEFAULT NULL,
  `base_fee`         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `registration_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_pct`          DECIMAL(5,2)  NOT NULL DEFAULT 0.00,   -- GST %, 0 if exempt
  `installments`     TINYINT UNSIGNED NOT NULL DEFAULT 1,   -- 1 = pay in full
  `interval_days`    SMALLINT UNSIGNED NOT NULL DEFAULT 30, -- gap between dues
  `late_fee_per_day` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `late_fee_cap`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- 0 = uncapped
  `grace_days`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `status`           ENUM('active','archived') NOT NULL DEFAULT 'active',
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feeplan_course` (`course_id`, `status`),
  CONSTRAINT `fk_feeplan_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_feeplan_installments` CHECK (`installments` BETWEEN 1 AND 36),
  CONSTRAINT `ck_feeplan_tax` CHECK (`tax_pct` >= 0 AND `tax_pct` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fee_installments` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `seq`          TINYINT UNSIGNED NOT NULL,          -- 1..n
  `invoice_no`   VARCHAR(40)   NOT NULL,
  `amount`       DECIMAL(12,2) NOT NULL,             -- what is owed on this slice
  `due_date`     DATE          NOT NULL,
  `paid_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`       ENUM('pending','partial','paid','overdue','waived') NOT NULL DEFAULT 'pending',
  `paid_on`      DATE          DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_installment_seq` (`student_id`, `seq`),
  UNIQUE KEY `uq_installment_invoice` (`invoice_no`),
  KEY `idx_installment_due` (`due_date`, `status`),   -- drives the overdue sweep
  CONSTRAINT `fk_inst_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fee_fines` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`     INT UNSIGNED NOT NULL,
  `installment_id` INT UNSIGNED NOT NULL,
  `amount`         DECIMAL(10,2) NOT NULL,
  `days_late`      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `reason`         VARCHAR(255) DEFAULT NULL,
  `status`         ENUM('open','paid','waived') NOT NULL DEFAULT 'open',
  `waived_by`      INT UNSIGNED DEFAULT NULL,
  `waived_reason`  VARCHAR(255) DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- one live fine per installment: the daily sweep TOPS UP this row rather than
  -- inserting a new fine every night.
  UNIQUE KEY `uq_fine_installment` (`installment_id`),
  KEY `idx_fine_student` (`student_id`, `status`),
  CONSTRAINT `fk_fine_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fine_inst` FOREIGN KEY (`installment_id`) REFERENCES `fee_installments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_no`  VARCHAR(40)  NOT NULL,
  `category`    ENUM('rent','utilities','salary','marketing','equipment','courseware','maintenance','other')
                NOT NULL DEFAULT 'other',
  `payee`       VARCHAR(180) DEFAULT NULL,
  `amount`      DECIMAL(12,2) NOT NULL,
  `spent_on`    DATE NOT NULL,
  `mode`        ENUM('cash','card','upi','bank','cheque') NOT NULL DEFAULT 'bank',
  `reference_no` VARCHAR(80) DEFAULT NULL,
  `note`        VARCHAR(255) DEFAULT NULL,
  `faculty_id`  INT UNSIGNED DEFAULT NULL,           -- set when category = salary
  `created_by`  INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expense_voucher` (`voucher_no`),
  KEY `idx_expense_period` (`spent_on`, `category`),
  CONSTRAINT `fk_expense_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expense_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_expense_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  TSP — Trainer · Student · Placement.
--
--  The loop this exists to close:
--
--    Trainer benchmarks skill ─┐
--    Trainer clears soft skills├─> employability = job_ready ──> matched to a JD
--    Attendance + test score  ─┘                                      │
--            ▲                                                        v
--            └── remedial task ◀── skill deficiency ◀── interview rejection
--
--  A student is NEVER marked job-ready by hand. The status is DERIVED from
--  attendance, benchmarked technical scores and the trainer's sign-off — see
--  EmployabilityService. The one exception is 'blocked', which is a human act.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `skills` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`     VARCHAR(80) NOT NULL,
  `category` VARCHAR(60) DEFAULT NULL,        -- language / framework / db / tool / soft
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What a student can actually do. `verified_by` separates "I say I know React"
-- from "a trainer benchmarked it" — recruiters only ever see the latter.
CREATE TABLE IF NOT EXISTS `student_skills` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`  INT UNSIGNED NOT NULL,
  `skill_id`    INT UNSIGNED NOT NULL,
  `level`       ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `source`      ENUM('self','trainer') NOT NULL DEFAULT 'self',
  `verified_by` INT UNSIGNED DEFAULT NULL,     -- faculty who vouched for it
  `verified_at` DATETIME DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_skill` (`student_id`, `skill_id`),
  KEY `idx_sskill_skill` (`skill_id`, `level`),
  CONSTRAINT `fk_sskill_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sskill_skill`   FOREIGN KEY (`skill_id`)   REFERENCES `skills` (`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_sskill_faculty` FOREIGN KEY (`verified_by`) REFERENCES `faculty` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Technical benchmarking: weekly mock tests, code reviews, lab exams, mock
-- interviews. `pct` is STORED-generated so the readiness query cannot drift
-- from the marks it is derived from.
CREATE TABLE IF NOT EXISTS `skill_assessments` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`     INT UNSIGNED NOT NULL,
  `batch_id`       INT UNSIGNED DEFAULT NULL,
  `faculty_id`     INT UNSIGNED DEFAULT NULL,
  `skill_id`       INT UNSIGNED DEFAULT NULL,
  `type`           ENUM('mock_test','code_review','lab_exam','mock_interview','project') NOT NULL DEFAULT 'mock_test',
  `title`          VARCHAR(160) NOT NULL,
  `max_marks`      DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  `marks_obtained` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `pct`            DECIMAL(5,2) AS (ROUND((`marks_obtained` / NULLIF(`max_marks`,0)) * 100, 2)) STORED,
  `weight`         TINYINT UNSIGNED NOT NULL DEFAULT 1,   -- a final lab exam counts more than a pop quiz
  `assessed_on`    DATE NOT NULL,
  `remarks`        VARCHAR(500) DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sa_student` (`student_id`, `assessed_on`),
  KEY `idx_sa_batch` (`batch_id`),
  CONSTRAINT `fk_sa_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_sa_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_sa_skill`   FOREIGN KEY (`skill_id`)   REFERENCES `skills` (`id`)   ON DELETE SET NULL,
  CONSTRAINT `ck_sa_marks` CHECK (`marks_obtained` >= 0 AND `marks_obtained` <= `max_marks`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Soft skills. Recruiters ask about these first and no ERP records them.
CREATE TABLE IF NOT EXISTS `soft_skill_ratings` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`      INT UNSIGNED NOT NULL,
  `faculty_id`      INT UNSIGNED DEFAULT NULL,
  `batch_id`        INT UNSIGNED DEFAULT NULL,
  `communication`   TINYINT UNSIGNED NOT NULL,
  `punctuality`     TINYINT UNSIGNED NOT NULL,
  `teamwork`        TINYINT UNSIGNED NOT NULL,
  `professionalism` TINYINT UNSIGNED NOT NULL,
  `overall`         DECIMAL(3,2) AS ((`communication` + `punctuality` + `teamwork` + `professionalism`) / 4) STORED,
  `notes`           VARCHAR(500) DEFAULT NULL,
  `rated_on`        DATE NOT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ssr_student` (`student_id`, `rated_on`),
  CONSTRAINT `fk_ssr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssr_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_ssr_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `ck_ssr_range` CHECK (
    `communication` BETWEEN 1 AND 5 AND `punctuality` BETWEEN 1 AND 5 AND
    `teamwork` BETWEEN 1 AND 5 AND `professionalism` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The student's own evidence: resume, GitHub, live projects.
CREATE TABLE IF NOT EXISTS `student_profiles` (
  `student_id`    INT UNSIGNED NOT NULL,
  `resume_path`   VARCHAR(512) DEFAULT NULL,
  `resume_name`   VARCHAR(255) DEFAULT NULL,
  `resume_text`   MEDIUMTEXT   DEFAULT NULL,   -- extracted, for keyword matching
  `github_url`    VARCHAR(255) DEFAULT NULL,
  `portfolio_url` VARCHAR(255) DEFAULT NULL,
  `linkedin_url`  VARCHAR(255) DEFAULT NULL,
  `summary`       VARCHAR(1000) DEFAULT NULL,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  FULLTEXT KEY `ft_resume` (`resume_text`),
  CONSTRAINT `fk_sprofile_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What a JD actually demands. `is_mandatory` is the difference between a filter
-- and a nice-to-have — matching treats them completely differently.
CREATE TABLE IF NOT EXISTS `job_skills` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id`       INT UNSIGNED NOT NULL,
  `skill_id`     INT UNSIGNED NOT NULL,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 1,
  `min_level`    ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_job_skill` (`job_id`, `skill_id`),
  CONSTRAINT `fk_jskill_job`   FOREIGN KEY (`job_id`)   REFERENCES `placement_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jskill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every round of every interview, and how it went.
CREATE TABLE IF NOT EXISTS `interview_logs` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` INT UNSIGNED NOT NULL,
  `round`          ENUM('internal_screening','client_round_1','client_round_2','technical','hr','final') NOT NULL,
  `scheduled_at`   DATETIME DEFAULT NULL,
  `interviewer`    VARCHAR(160) DEFAULT NULL,
  `result`         ENUM('pending','passed','failed','no_show') NOT NULL DEFAULT 'pending',
  `feedback`       VARCHAR(1000) DEFAULT NULL,
  `logged_by`      INT UNSIGNED DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ilog_app` (`application_id`, `created_at`),
  CONSTRAINT `fk_ilog_app`  FOREIGN KEY (`application_id`) REFERENCES `placement_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ilog_user` FOREIGN KEY (`logged_by`)      REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Rejected — weak on SQL joins." THIS row is what closes the loop: it names a
-- skill, so the system can route the gap back to the trainer who teaches it.
CREATE TABLE IF NOT EXISTS `interview_deficiencies` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `interview_log_id` INT UNSIGNED NOT NULL,
  `skill_id`         INT UNSIGNED NOT NULL,
  `note`             VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ideficiency` (`interview_log_id`, `skill_id`),
  CONSTRAINT `fk_idef_log`   FOREIGN KEY (`interview_log_id`) REFERENCES `interview_logs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_idef_skill` FOREIGN KEY (`skill_id`)         REFERENCES `skills` (`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The work the loop generates. Raised automatically from a rejection, or by
-- hand when a trainer sees someone struggling.
CREATE TABLE IF NOT EXISTS `remedial_tasks` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   INT UNSIGNED NOT NULL,
  `faculty_id`   INT UNSIGNED DEFAULT NULL,        -- whose dashboard it lands on
  `batch_id`     INT UNSIGNED DEFAULT NULL,
  `skill_id`     INT UNSIGNED DEFAULT NULL,
  `title`        VARCHAR(200) NOT NULL,
  `detail`       VARCHAR(1000) DEFAULT NULL,
  `source`       ENUM('interview_feedback','assessment','manual') NOT NULL DEFAULT 'manual',
  `source_ref`   INT UNSIGNED DEFAULT NULL,        -- the interview_log that caused it
  `due_date`     DATE DEFAULT NULL,
  `status`       ENUM('open','in_progress','done','cancelled') NOT NULL DEFAULT 'open',
  `created_by`   INT UNSIGNED DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_faculty` (`faculty_id`, `status`),
  KEY `idx_rt_student` (`student_id`, `status`),
  CONSTRAINT `fk_rt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rt_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_rt_batch`   FOREIGN KEY (`batch_id`)   REFERENCES `batches` (`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_rt_skill`   FOREIGN KEY (`skill_id`)   REFERENCES `skills` (`id`)   ON DELETE SET NULL,
  CONSTRAINT `fk_rt_user`    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  ATTENDANCE SESSIONS — proof a student was actually in the room.
--
--  Marking attendance is the assigned trainer's job, full stop. But a student
--  may ALSO mark themselves present — on one condition: they can only do it
--  while the trainer has a session OPEN, by entering the short code the trainer
--  shows on the classroom screen. The code is the presence proof: you cannot
--  type it unless you are in the room looking at it.
--
--  open  -> students may check in with the code
--  closed-> the window is shut; only the trainer can still adjust the register
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance_sessions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`     INT UNSIGNED NOT NULL,
  `session_date` DATE NOT NULL,
  `code`         CHAR(6) NOT NULL,                 -- shown in class, entered by students
  `status`       ENUM('open','closed') NOT NULL DEFAULT 'open',
  `opened_by`    INT UNSIGNED DEFAULT NULL,        -- the faculty user who opened it
  `opened_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at`    DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_att_session` (`batch_id`, `session_date`),
  KEY `idx_att_session_open` (`status`, `session_date`),
  CONSTRAINT `fk_attsession_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attsession_user`  FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
--  CHAT — internal 1:1 messaging between employees and trainers.
--
--  Two tables, no more. A room is a PAIR of people, stored with the smaller id
--  always in `user_a`. That ordering invariant is the whole trick: looking up
--  "the room for me and you" becomes one deterministic lookup on a unique key
--  instead of an OR across two columns, and it makes a duplicate room
--  impossible rather than merely unlikely.
--
--  Read state lives on the MESSAGE (`read_at`), not as a counter on the room.
--  A stored counter is a second source of truth that drifts the first time an
--  update is missed; a COUNT over `read_at IS NULL` cannot drift.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_a`          INT UNSIGNED NOT NULL,          -- ALWAYS the smaller user id
  `user_b`          INT UNSIGNED NOT NULL,          -- ALWAYS the larger
  `last_message_at` DATETIME DEFAULT NULL,          -- drives the conversation order
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_pair` (`user_a`, `user_b`),
  KEY `idx_chat_a` (`user_a`, `last_message_at`),
  KEY `idx_chat_b` (`user_b`, `last_message_at`),
  CONSTRAINT `fk_room_a` FOREIGN KEY (`user_a`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_room_b` FOREIGN KEY (`user_b`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_chat_pair` CHECK (`user_a` < `user_b`)   -- no self-chat, no unordered pair
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_id`      INT UNSIGNED NOT NULL,
  `sender_id`    INT UNSIGNED NOT NULL,
  `body`         TEXT NOT NULL,
  `delivered_at` DATETIME DEFAULT NULL,   -- they were online when it was sent
  `read_at`      DATETIME DEFAULT NULL,   -- they actually had the thread open
  `edited_at`    DATETIME DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- History pagination: newest-first within a room.
  KEY `idx_msg_room_time` (`room_id`, `id`),
  -- The unread count: "messages in this room, not from me, not yet read".
  KEY `idx_msg_unread` (`room_id`, `sender_id`, `read_at`),
  CONSTRAINT `fk_msg_room`   FOREIGN KEY (`room_id`)   REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

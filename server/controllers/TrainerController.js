/**
 * TrainerController — "/api/faculty/me/*" (row-level secured).
 *
 * SECURITY MODEL
 * --------------
 * A trainer never passes their own identity; it is derived from the JWT.
 * Every method funnels through `assertOwnsBatch()`, which resolves the faculty
 * row for the token and verifies `batches.faculty_id = faculty.id`. There is no
 * endpoint here that accepts a `batch_id` and trusts it — that is the whole
 * point of "a Trainer can only query data belonging to batch_ids assigned
 * directly to them".
 */
const { query } = require('../config/db');
const { today } = require('../helpers/dateUtils');
const CertificateService = require('../services/CertificateService');
const NotificationService = require('../services/NotificationService');
const { sendMail } = require('../config/mail');
const { success, created, fail } = require('../utils/response');

const httpError = (message, status) => Object.assign(new Error(message), { status });

const ASSESSMENTS = ['exam', 'theory', 'practical', 'project', 'mock_interview', 'assignment'];
const FLAG_REASONS = ['low_attendance', 'failing_grades', 'misconduct', 'other'];
const ATTENDANCE_THRESHOLD = Number(process.env.ATTENDANCE_THRESHOLD) || 75;

/** The faculty row for the logged-in user. */
async function resolveFaculty(req) {
  const rows = await query('SELECT * FROM faculty WHERE user_id = ? LIMIT 1', [req.user.id]);
  if (!rows[0]) throw httpError('No faculty profile is linked to this account.', 403);
  return rows[0];
}

/** THE row-level security gate. Returns the batch, or throws 403. */
async function assertOwnsBatch(req, batchId) {
  const faculty = await resolveFaculty(req);
  const rows = await query('SELECT * FROM batches WHERE id = ? AND faculty_id = ? LIMIT 1', [batchId, faculty.id]);
  if (!rows[0]) throw httpError('This batch is not assigned to you.', 403);
  return { faculty, batch: rows[0] };
}

const letterGrade = (pct) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';

const TrainerController = {
  assertOwnsBatch, // exported for reuse/tests

  /* ------------------------------------------------ curriculum checklist */

  // GET /faculty/me/syllabus/:batchId
  async syllabus(req, res) {
    const { batch } = await assertOwnsBatch(req, req.params.batchId);

    const rows = await query(
      `SELECT cs.id AS syllabus_id, cs.seq, cs.topic, cs.description, cs.hours,
              COALESCE(tp.status, 'pending') AS status, tp.covered_on, tp.notes
       FROM course_syllabus cs
       LEFT JOIN topic_progress tp ON tp.syllabus_id = cs.id AND tp.batch_id = ?
       WHERE cs.course_id = ?
       ORDER BY cs.seq ASC`,
      [batch.id, batch.course_id]
    );

    const covered = rows.filter((r) => r.status === 'covered').length;
    const nextUp = rows.find((r) => r.status !== 'covered') || null;

    return success(res, {
      data: {
        batch: { id: batch.id, name: batch.name },
        total: rows.length,
        covered,
        percent: rows.length ? Math.round((covered / rows.length) * 100) : 0,
        resume_from: nextUp,   // "where did I leave off"
        topics: rows,
      },
    }, 'Syllabus checklist fetched.');
  },

  // PATCH /faculty/me/syllabus/:batchId/:syllabusId  { status, notes? }
  async setTopicProgress(req, res) {
    const { faculty, batch } = await assertOwnsBatch(req, req.params.batchId);
    const { status, notes } = req.body || {};
    if (!['pending', 'in_progress', 'covered'].includes(status)) {
      return fail(res, "status must be pending, in_progress or covered.", 422);
    }

    // The topic must belong to this batch's course.
    const belongs = await query(
      'SELECT id FROM course_syllabus WHERE id = ? AND course_id = ?',
      [req.params.syllabusId, batch.course_id]
    );
    if (!belongs.length) return fail(res, 'That topic is not part of this batch’s course.', 404);

    await query(
      `INSERT INTO topic_progress (batch_id, syllabus_id, faculty_id, status, covered_on, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), covered_on = VALUES(covered_on),
                               notes = VALUES(notes), faculty_id = VALUES(faculty_id)`,
      [batch.id, req.params.syllabusId, faculty.id, status, status === 'covered' ? today() : null, notes || null]
    );
    return success(res, {}, 'Topic progress updated.');
  },

  /* ---------------------------------------------------------- grading */

  // POST /faculty/me/grades  { student_id, batch_id, assessment_type, title, max_marks, marks_obtained, feedback?, is_final? }
  async grade(req, res) {
    const body = req.body || {};
    const { batch } = await assertOwnsBatch(req, body.batch_id);

    if (!ASSESSMENTS.includes(body.assessment_type)) {
      return fail(res, `assessment_type must be one of: ${ASSESSMENTS.join(', ')}.`, 422);
    }
    if (!body.student_id || !body.title) return fail(res, 'student_id and title are required.', 422);

    const max = Number(body.max_marks ?? 100);
    const got = Number(body.marks_obtained);
    if (Number.isNaN(got) || got < 0 || got > max) {
      return fail(res, `marks_obtained must be between 0 and ${max}.`, 422);
    }

    // The student must actually be enrolled in THIS batch.
    const enrolled = await query(
      "SELECT 1 FROM student_batches WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
      [body.student_id, batch.id]
    );
    if (!enrolled.length) return fail(res, 'That student is not enrolled in this batch.', 403);

    const grade = body.grade || letterGrade((got / max) * 100);
    await query(
      `INSERT INTO student_grades
         (student_id, batch_id, assessment_type, title, max_marks, marks_obtained, grade, feedback, is_final, graded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks),
                               grade = VALUES(grade), feedback = VALUES(feedback),
                               is_final = VALUES(is_final), graded_by = VALUES(graded_by),
                               graded_at = CURRENT_TIMESTAMP`,
      [body.student_id, batch.id, body.assessment_type, body.title, max, got, grade,
        body.feedback || null, body.is_final ? 1 : 0, req.user.id]
    );

    const u = await query('SELECT user_id FROM students WHERE id = ? AND user_id IS NOT NULL', [body.student_id]);
    if (u[0]?.user_id) {
      NotificationService.notifyUser(u[0].user_id, {
        type: 'info', title: 'New grade published',
        message: `${body.title}: ${got}/${max} (${grade})`, link: '/classroom',
      });
    }

    return created(res, { data: { grade, marks_obtained: got, max_marks: max } }, 'Grade recorded.');
  },

  // GET /faculty/me/grades/:batchId
  async batchGrades(req, res) {
    const { batch } = await assertOwnsBatch(req, req.params.batchId);
    const rows = await query(
      `SELECT g.*, s.name AS student_name, s.student_uid
       FROM student_grades g JOIN students s ON s.id = g.student_id
       WHERE g.batch_id = ? ORDER BY s.name, g.graded_at DESC`,
      [batch.id]
    );
    return success(res, { data: rows }, 'Grades fetched.');
  },

  /* ------------------------------------------- flagging slow learners */

  /**
   * POST /faculty/me/flag-student  { student_id, batch_id, reason, note? }
   * Raises a flag AND alerts the counselor/admin (in-app + email).
   */
  async flagStudent(req, res) {
    const { faculty, batch } = await assertOwnsBatch(req, req.body?.batch_id);
    const { student_id, reason, note } = req.body || {};
    if (!student_id || !FLAG_REASONS.includes(reason)) {
      return fail(res, `student_id and a reason (${FLAG_REASONS.join(', ')}) are required.`, 422);
    }

    const enrolled = await query(
      "SELECT s.name FROM student_batches sb JOIN students s ON s.id = sb.student_id WHERE sb.student_id = ? AND sb.batch_id = ? AND sb.status='enrolled'",
      [student_id, batch.id]
    );
    if (!enrolled.length) return fail(res, 'That student is not enrolled in this batch.', 403);

    // Attach the objective metric that justifies the flag — and refuse a
    // `low_attendance` flag when the data says attendance is actually fine.
    let metric = null;
    if (reason === 'low_attendance') {
      const a = await query(
        `SELECT ROUND(100 * SUM(status='present') / COUNT(*)) pct, COUNT(*) marked
         FROM attendance WHERE student_id = ? AND batch_id = ?`,
        [student_id, batch.id]
      );
      const pct = a[0]?.pct;
      if (a[0]?.marked > 0 && pct != null) {
        if (pct >= ATTENDANCE_THRESHOLD) {
          return fail(
            res,
            `Attendance is ${pct}%, at or above the ${ATTENDANCE_THRESHOLD}% threshold — use a different reason.`,
            422
          );
        }
        metric = `attendance=${pct}% (threshold ${ATTENDANCE_THRESHOLD}%)`;
      }
    }

    const r = await query(
      'INSERT INTO student_flags (student_id, batch_id, faculty_id, reason, note, metric) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, batch.id, faculty.id, reason, note || null, metric]
    );

    // Route to counselors + admins.
    const staff = await query(
      "SELECT id, email FROM users WHERE role IN ('staff','admin','super_admin') AND status='active'"
    );
    const title = `Student flagged: ${enrolled[0].name}`;
    const message = `${faculty.name} flagged ${enrolled[0].name} (${batch.name}) — ${reason}${metric ? ` · ${metric}` : ''}.`;
    for (const s of staff) {
      NotificationService.notifyUser(s.id, { type: 'warning', title, message, link: '/students' });
    }
    // Send + audit (email_logs), so every outbound alert is traceable.
    const to = staff.map((s) => s.email).filter(Boolean).join(', ') || 'admin@envision.local';
    (async () => {
      let status = 'logged';
      let error = null;
      try {
        const r = await sendMail({ to, subject: title, text: `${message}\n\nNote: ${note || '-'}` });
        status = r.sent ? 'sent' : 'logged';
      } catch (e) { status = 'failed'; error = e.message.slice(0, 250); }
      await query(
        `INSERT INTO email_logs (template, recipient_type, recipient_id, recipient_email, subject, status, error, meta, triggered_by)
         VALUES ('student_flag', 'staff', NULL, ?, ?, ?, ?, ?, ?)`,
        [to, title.slice(0, 200), status, error, JSON.stringify({ student_id, batch_id: batch.id, reason, metric }), req.user.id]
      );
    })().catch(() => {});

    return created(res, { data: { flagId: r.insertId, metric } }, 'Student flagged; counselor has been alerted.');
  },

  /* ------------------------------------- assignment open/close status */

  // PATCH /faculty/me/assignments/:id/status  { status: open|closed }
  async setAssignmentStatus(req, res) {
    const { status } = req.body || {};
    if (!['open', 'closed'].includes(status)) return fail(res, "status must be 'open' or 'closed'.", 422);

    const rows = await query(
      `SELECT m.id, m.batch_id FROM course_materials m WHERE m.id = ?`, [req.params.id]
    );
    if (!rows[0]) return fail(res, 'Assignment not found.', 404);
    await assertOwnsBatch(req, rows[0].batch_id);   // row-level gate

    await query('UPDATE course_materials SET status = ? WHERE id = ?', [status, req.params.id]);
    return success(res, {}, `Assignment marked ${status}.`);
  },

  /* --------------------------------- course closure & certification */

  /** POST /faculty/me/batches/:batchId/complete — course closure sign-off. */
  async completeBatch(req, res) {
    const { batch } = await assertOwnsBatch(req, req.params.batchId);
    if (batch.status === 'completed') return fail(res, 'This batch is already completed.', 409);

    await query(
      "UPDATE batches SET status = 'completed', completed_at = NOW(), completed_by = ? WHERE id = ?",
      [req.user.id, batch.id]
    );
    await query(
      "UPDATE student_batches SET status = 'completed', completed_on = CURDATE() WHERE batch_id = ? AND status = 'enrolled'",
      [batch.id]
    );

    const admins = await query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND status='active'");
    for (const a of admins) {
      NotificationService.notifyUser(a.id, {
        type: 'info', title: 'Batch completed',
        message: `${batch.name} was signed off by the trainer.`, link: '/batches',
      });
    }
    return success(res, {}, 'Batch marked completed.');
  },

  /**
   * POST /faculty/me/students/:studentId/certify  { batch_id, template_id?, remarks? }
   * The trainer confirms the student met all criteria — this GENERATES the
   * certificate. Idempotent: a second call returns the existing certificate.
   */
  async approveCertificate(req, res) {
    const { batch } = await assertOwnsBatch(req, req.body?.batch_id);
    const studentId = req.params.studentId;

    const enrolled = await query(
      'SELECT s.id, s.name, s.user_id FROM student_batches sb JOIN students s ON s.id = sb.student_id WHERE sb.student_id = ? AND sb.batch_id = ?',
      [studentId, batch.id]
    );
    if (!enrolled.length) return fail(res, 'That student is not in this batch.', 403);

    // Same eligibility gate as the admin path — a trainer's say-so does not
    // clear a student's unpaid fees. CertificateService throws 409 with the
    // failed checks attached if they are not ready; it is also idempotent.
    const result = await CertificateService.issue({
      student_id: studentId,
      template_id: req.body?.template_id || null,
      remarks: req.body?.remarks || `Approved by trainer for ${batch.name}`,
      issued_by: req.user.id,
      // A trainer may NOT override — only a coordinator/admin can, via /certificates/issue.
      override_reason: null,
    });

    if (result.already) {
      return success(res, { data: result.certificate }, 'Certificate already issued.');
    }

    if (enrolled[0].user_id) {
      NotificationService.notifyUser(enrolled[0].user_id, {
        type: 'info', title: '🎓 Your certificate is ready',
        message: `Certificate ${result.certificate.certificate_number} has been issued.`, link: '/certificates',
      });
    }

    return created(res, { data: result.certificate }, 'Certificate approved and generated.');
  },
};

module.exports = TrainerController;

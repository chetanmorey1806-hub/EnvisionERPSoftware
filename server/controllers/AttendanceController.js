/**
 * AttendanceController — /api/attendance.
 *
 * The rules this file enforces:
 *
 *   1. MARKING is the assigned trainer's job. Not "anyone with a permission" —
 *      the trainer who owns the batch. An admin can VIEW the register but the
 *      mark buttons do nothing for them, because the server refuses (403). This
 *      is enforced here, server-side, not just hidden in the UI.
 *
 *   2. A STUDENT may mark themselves present, but only while the trainer has a
 *      session OPEN, and only by entering the code the trainer shows in class.
 *      The code is the presence proof — you can't type it unless you're in the
 *      room. Self-marking absent is not a thing; you cannot be absent-present.
 *
 * Row-level ownership is derived from the faculty row linked to the JWT, never
 * from an id in the request.
 */
const { query } = require('../config/db');
const { findById } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');
const NotificationService = require('../services/NotificationService');

const STATUSES = ['present', 'absent', 'late', 'leave'];

const httpError = (message, status) => Object.assign(new Error(message), { status });

/** The faculty row for the caller, or null (admins/staff have none). */
async function facultyOf(userId) {
  const rows = await query('SELECT * FROM faculty WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

/**
 * THE marking gate. Only the trainer assigned to the batch may mark it.
 * Returns that faculty row, or throws 403. super_admin is intentionally NOT
 * exempt — marking attendance is a classroom act, and the whole point of this
 * change is that it belongs to the trainer, not the front office.
 */
async function assertBatchTrainer(req, batchId) {
  const faculty = await facultyOf(req.user.id);
  if (!faculty) {
    throw httpError('Only the batch’s assigned trainer can mark attendance. Admins can view it but not change it.', 403);
  }
  const [batch] = await query('SELECT id, name, faculty_id FROM batches WHERE id = ? LIMIT 1', [batchId]);
  if (!batch) throw httpError('Batch not found.', 404);
  if (Number(batch.faculty_id) !== Number(faculty.id)) {
    throw httpError('This batch is not assigned to you.', 403);
  }
  return { faculty, batch };
}

const AttendanceController = {
  // GET /attendance?batchId=&date=   — VIEW. Admins and the trainer both allowed.
  async getRegister(req, res) {
    const { batchId, date } = req.query;
    if (!batchId || !date) return fail(res, 'batchId and date are required.', 422);

    const rows = await query(
      `SELECT s.id AS student_id, s.name, s.admission_no,
              a.status, a.source, a.id AS attendance_id
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND a.batch_id = ? AND a.date = ?
       WHERE s.batch_id = ?
          OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id = s.id AND sb.batch_id = ?)
       ORDER BY s.name ASC`,
      [batchId, date, batchId, batchId]
    );

    // Is this viewer the trainer who may actually mark it?
    const faculty = await facultyOf(req.user.id);
    const [batch] = await query('SELECT faculty_id FROM batches WHERE id = ?', [batchId]);
    const canMark = Boolean(faculty && batch && Number(batch.faculty_id) === Number(faculty.id));

    const [session] = await query(
      'SELECT id, code, status, opened_at FROM attendance_sessions WHERE batch_id = ? AND session_date = ?',
      [batchId, date]
    );

    return success(res, {
      data: {
        batchId: Number(batchId),
        date,
        register: rows,
        can_mark: canMark,               // the UI hides the buttons when false
        session: session || null,
        marked: rows.filter((r) => r.status).length,
        present: rows.filter((r) => ['present', 'late'].includes(r.status)).length,
      },
    }, 'Register fetched.');
  },

  // POST /attendance/bulk  { batchId, date, records:[{studentId,status}] }  — TRAINER only.
  async submitBulk(req, res) {
    const { batchId, date, records } = req.body || {};
    if (!batchId || !date || !Array.isArray(records)) {
      return fail(res, 'batchId, date and records[] are required.', 422);
    }

    await assertBatchTrainer(req, batchId);   // throws 403 for admins / other trainers

    const roster = await query(
      `SELECT s.id FROM students s
       WHERE s.batch_id = ?
          OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id = s.id AND sb.batch_id = ?)`,
      [batchId, batchId]
    );
    const enrolled = new Set(roster.map((r) => Number(r.id)));

    const rejected = [];
    let saved = 0;
    for (const r of records) {
      if (!r.studentId) continue;
      if (!enrolled.has(Number(r.studentId))) { rejected.push(Number(r.studentId)); continue; }
      const status = STATUSES.includes(r.status) ? r.status : 'present';
      await query(
        `INSERT INTO attendance (batch_id, student_id, date, status, marked_by, source)
         VALUES (?, ?, ?, ?, ?, 'trainer')
         ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), source = 'trainer'`,
        [batchId, r.studentId, date, status, req.user.id]
      );
      saved += 1;
    }

    if (rejected.length && saved === 0) {
      return fail(res, `None of those students are in this batch (${rejected.join(', ')}).`, 403);
    }
    return success(res, { data: { saved, rejected } },
      rejected.length
        ? `Attendance saved for ${saved} students. ${rejected.length} not in this batch were skipped.`
        : `Attendance saved for ${saved} students.`);
  },

  // ---- Class check-in session (trainer opens, students self-mark) ----------

  // POST /attendance/session/open  { batchId, date? }  — TRAINER only.
  async openSession(req, res) {
    const { batchId } = req.body || {};
    const date = req.body?.date || new Date().toISOString().slice(0, 10);
    const { batch } = await assertBatchTrainer(req, batchId);

    const [existing] = await query(
      'SELECT * FROM attendance_sessions WHERE batch_id = ? AND session_date = ?', [batchId, date]
    );
    if (existing && existing.status === 'open') {
      return success(res, { data: existing }, `Check-in is already open. Code: ${existing.code}`);
    }

    // A 6-digit code. It only needs to be unguessable for the length of one
    // class, not cryptographic — derived without Math.random (which is banned
    // and would break test determinism) but salted by the clock so reopening a
    // day's session rotates the code.
    const salt = Math.floor(Date.now() / 1000) % 900000;
    const code = String(100000 + ((Number(batchId) * 7919 + salt) % 900000)).slice(0, 6);

    if (existing) {
      await query(
        "UPDATE attendance_sessions SET status='open', code=?, opened_by=?, opened_at=NOW(), closed_at=NULL WHERE id=?",
        [code, req.user.id, existing.id]
      );
    } else {
      await query(
        `INSERT INTO attendance_sessions (batch_id, session_date, code, status, opened_by)
         VALUES (?, ?, ?, 'open', ?)`,
        [batchId, date, code, req.user.id]
      );
    }
    const [session] = await query(
      'SELECT * FROM attendance_sessions WHERE batch_id = ? AND session_date = ?', [batchId, date]
    );

    // Ping the enrolled students so they know check-in is live.
    const students = await query(
      `SELECT s.user_id FROM students s
       WHERE (s.batch_id = ? OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id=s.id AND sb.batch_id=?))
         AND s.user_id IS NOT NULL`,
      [batchId, batchId]
    );
    for (const s of students) {
      NotificationService.notifyUser(s.user_id, {
        type: 'info', title: '📍 Attendance is open',
        message: `Check in for ${batch.name} now — enter the code your trainer shows in class.`,
        link: '/my-attendance',
      }).catch(() => {});
    }

    return created(res, { data: session }, `Check-in open. Show this code in class: ${code}`);
  },

  // POST /attendance/session/close  { batchId, date? }  — TRAINER only.
  async closeSession(req, res) {
    const { batchId } = req.body || {};
    const date = req.body?.date || new Date().toISOString().slice(0, 10);
    await assertBatchTrainer(req, batchId);

    const [session] = await query(
      'SELECT * FROM attendance_sessions WHERE batch_id = ? AND session_date = ?', [batchId, date]
    );
    if (!session) return fail(res, 'There is no check-in session for that day.', 404);

    await query("UPDATE attendance_sessions SET status='closed', closed_at=NOW() WHERE id=?", [session.id]);

    // Anyone who never checked in AND was never marked is now, on the record,
    // absent. Closing the window finalises the register — but only fills the
    // GAPS, so it never overwrites a mark the trainer made by hand.
    const filled = await query(
      `INSERT INTO attendance (batch_id, student_id, date, status, marked_by, source)
       SELECT ?, s.id, ?, 'absent', ?, 'trainer'
       FROM students s
       WHERE (s.batch_id = ? OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id=s.id AND sb.batch_id=?))
         AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.batch_id=? AND a.student_id=s.id AND a.date=?)`,
      [batchId, date, req.user.id, batchId, batchId, batchId, date]
    );

    return success(res, { data: { closed: true, marked_absent: filled.affectedRows || 0 } },
      `Check-in closed. ${filled.affectedRows || 0} no-shows marked absent.`);
  },

  // ---- Student self check-in (must be inside class = must have the code) ----

  // GET /students/me/attendance  — is a session open for one of my batches today?
  async myStatus(req, res) {
    const today = new Date().toISOString().slice(0, 10);
    const [open] = await query(
      `SELECT ses.id, ses.batch_id, b.name AS batch_name, ses.session_date
       FROM attendance_sessions ses
       JOIN batches b ON b.id = ses.batch_id
       WHERE ses.status = 'open' AND ses.session_date = ?
         AND (b.id = ? OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id=? AND sb.batch_id=b.id))
       LIMIT 1`,
      [today, req.student.batch_id || 0, req.student.id]
    );
    const [mine] = await query(
      'SELECT status, source FROM attendance WHERE student_id = ? AND date = ? LIMIT 1',
      [req.student.id, today]
    );
    const [summary] = await query(
      `SELECT COUNT(*) total, COALESCE(SUM(status IN ('present','late')),0) present
       FROM attendance WHERE student_id = ?`, [req.student.id]
    );
    return success(res, {
      data: {
        open_session: open || null,
        today: mine || null,
        percentage: Number(summary.total) ? Math.round((Number(summary.present) / Number(summary.total)) * 100) : 0,
        total: Number(summary.total),
      },
    }, 'Attendance status fetched.');
  },

  // POST /students/me/attendance/checkin  { code }
  async checkIn(req, res) {
    const code = String(req.body?.code || '').trim();
    if (!code) return fail(res, 'Enter the code your trainer showed in class.', 422);
    const today = new Date().toISOString().slice(0, 10);

    // The session must be OPEN, for TODAY, for a batch this student is IN, and
    // the code must match. All four, or no check-in — that is what makes the
    // code a proof of presence rather than a formality.
    const [session] = await query(
      `SELECT ses.* FROM attendance_sessions ses
       JOIN batches b ON b.id = ses.batch_id
       WHERE ses.status='open' AND ses.session_date=? AND ses.code=?
         AND (b.id = ? OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id=? AND sb.batch_id=b.id))
       LIMIT 1`,
      [today, code, req.student.batch_id || 0, req.student.id]
    );
    if (!session) {
      return fail(res, 'That code is not valid right now. Check-in must be open and the code must match your class.', 403);
    }

    const [existing] = await query(
      'SELECT status, source FROM attendance WHERE student_id=? AND batch_id=? AND date=? LIMIT 1',
      [req.student.id, session.batch_id, today]
    );
    if (existing && existing.status === 'absent' && existing.source === 'trainer') {
      // The trainer explicitly marked them absent. A student cannot self-serve
      // their way out of that — they should talk to the trainer.
      return fail(res, 'Your trainer has marked you absent for today. Please speak to them.', 409);
    }

    await query(
      `INSERT INTO attendance (batch_id, student_id, date, status, marked_by, source)
       VALUES (?, ?, ?, 'present', ?, 'self')
       ON DUPLICATE KEY UPDATE status='present', source='self', marked_by=VALUES(marked_by)`,
      [session.batch_id, req.student.id, today, req.user.id]
    );
    return created(res, { data: { status: 'present', date: today } }, '✓ You are marked present.');
  },

  // GET /attendance/student/:studentId  (self or staff — gated in the route)
  async getStudentReport(req, res) {
    if (!(await findById('students', req.params.studentId))) return fail(res, 'Student not found.', 404);
    const rows = await query(
      'SELECT date, status, source FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [req.params.studentId]
    );
    const summary = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    const total = rows.length;
    const present = (summary.present || 0) + (summary.late || 0);
    return success(res, {
      data: { total, summary, percentage: total ? Math.round((present / total) * 100) : 0, records: rows },
    }, 'Attendance report fetched.');
  },
};

module.exports = AttendanceController;

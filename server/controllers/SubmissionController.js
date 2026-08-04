/**
 * SubmissionController — students submit classwork/homework/projects;
 * trainers review and grade.
 *
 * A student may only submit to an assignment for a batch they are actively
 * enrolled in. A trainer may only see/grade submissions for their own batches.
 * Both checks run server-side against the DB, never against a client-sent id.
 */
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');
const NotificationService = require('../services/NotificationService');

const isAdmin = (req) => ['admin', 'super_admin'].includes(req.user.role);

async function facultyOf(userId) {
  const rows = await query('SELECT id FROM faculty WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

const SubmissionController = {
  /**
   * POST /students/me/classroom/:materialId/submit   (multipart field: "file")
   * Re-submitting replaces the previous upload (UNIQUE material+student).
   */
  async submit(req, res) {
    const { materialId } = req.params;

    // The student must be enrolled in the batch this assignment belongs to.
    const rows = await query(
      `SELECT m.id, m.title, m.type, m.due_at, m.batch_id, m.faculty_id
       FROM course_materials m
       JOIN student_batches sb ON sb.batch_id = m.batch_id AND sb.status = 'enrolled'
       WHERE m.id = ? AND sb.student_id = ? LIMIT 1`,
      [materialId, req.student.id]
    );
    const item = rows[0];
    if (!item) return fail(res, 'Assignment not found for your batches.', 404);
    if (!['homework', 'classwork', 'assignment', 'lab'].includes(item.type)) {
      return fail(res, 'This item does not accept submissions.', 422);
    }

    const file = req.file || null;
    const note = req.body?.note || null;
    if (!file && !note) return fail(res, 'Attach a file or write a note.', 422);

    // Late is measured against the precise deadline (due_at), not the calendar
    // day — a task due at 10:30 is late at 10:31, not merely at midnight.
    const late = item.due_at && new Date(item.due_at) < new Date();
    const status = late ? 'late' : 'submitted';

    await query(
      `INSERT INTO assignment_submissions
         (material_id, student_id, note, file_name, file_url, mime_type, size_kb, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         note = VALUES(note), file_name = VALUES(file_name), file_url = VALUES(file_url),
         mime_type = VALUES(mime_type), size_kb = VALUES(size_kb), status = VALUES(status),
         grade = NULL, feedback = NULL, graded_by = NULL, graded_at = NULL,
         submitted_at = CURRENT_TIMESTAMP`,
      [
        materialId, req.student.id, note,
        file?.originalname || null,
        file ? `/uploads/submissions/${file.filename}` : null,
        file?.mimetype || null,
        file ? Math.round(file.size / 1024) : 0,
        status,
      ]
    );

    // Notify the trainer who owns the assignment.
    if (item.faculty_id) {
      const u = await query('SELECT user_id FROM faculty WHERE id = ? AND user_id IS NOT NULL', [item.faculty_id]);
      if (u[0]?.user_id) {
        NotificationService.notifyUser(u[0].user_id, {
          type: 'info',
          title: `Submission received${late ? ' (late)' : ''}`,
          message: `${req.student.name} submitted “${item.title}”.`,
          link: '/classroom',
        });
      }
    }

    const saved = await query(
      'SELECT * FROM assignment_submissions WHERE material_id = ? AND student_id = ?',
      [materialId, req.student.id]
    );
    return created(res, { data: saved[0] }, late ? 'Submitted (marked late).' : 'Submitted.');
  },

  // GET /students/me/submissions
  async mySubmissions(req, res) {
    const rows = await query(
      `SELECT s.*, m.title, m.type, m.due_date, b.name AS batch_name
       FROM assignment_submissions s
       JOIN course_materials m ON m.id = s.material_id
       LEFT JOIN batches b ON b.id = m.batch_id
       WHERE s.student_id = ? ORDER BY s.submitted_at DESC`,
      [req.student.id]
    );
    return success(res, { data: rows }, 'Your submissions fetched.');
  },

  // GET /classroom/:id/submissions   (trainer / admin)
  //
  // Lists the WHOLE roster, not just those who submitted — the point of this
  // screen is to see who is MISSING. Each student gets a computed status:
  //   done (green) submitted · missing (red) past deadline, nothing in ·
  //   pending (amber) still has time.
  async listForAssignment(req, res) {
    const owner = await query(
      `SELECT m.id, m.title, m.batch_id, m.due_at, b.faculty_id
       FROM course_materials m LEFT JOIN batches b ON b.id = m.batch_id WHERE m.id = ?`,
      [req.params.id]
    );
    const item = owner[0];
    if (!item) return fail(res, 'Assignment not found.', 404);

    if (!isAdmin(req)) {
      const faculty = await facultyOf(req.user.id);
      if (!faculty || item.faculty_id !== faculty.id) {
        return fail(res, 'This assignment does not belong to your batch.', 403);
      }
    }

    const rows = await query(
      `SELECT st.id AS student_id, st.name AS student_name, st.student_uid, st.phone, st.email,
              s.id AS submission_id, s.status AS submission_status, s.note,
              s.file_name, s.file_url, s.size_kb, s.grade, s.feedback, s.submitted_at,
              CASE
                WHEN s.id IS NOT NULL THEN 'done'
                WHEN ? IS NOT NULL AND ? < NOW() THEN 'missing'
                ELSE 'pending'
              END AS computed_status
       FROM students st
       LEFT JOIN assignment_submissions s ON s.material_id = ? AND s.student_id = st.id
       WHERE st.batch_id = ?
          OR EXISTS (SELECT 1 FROM student_batches sb WHERE sb.student_id = st.id AND sb.batch_id = ?)
       ORDER BY (s.id IS NULL) DESC, st.name ASC`,
      [item.due_at, item.due_at, req.params.id, item.batch_id, item.batch_id]
    );

    const done = rows.filter((r) => r.computed_status === 'done').length;
    const missing = rows.filter((r) => r.computed_status === 'missing').length;
    return success(res, {
      data: {
        assignment: item.title,
        due_at: item.due_at,
        summary: { total: rows.length, done, missing, pending: rows.length - done - missing },
        roster: rows,
      },
    }, 'Submissions fetched.');
  },

  // PATCH /classroom/submissions/:submissionId  { grade, feedback }
  async grade(req, res) {
    const { grade, feedback } = req.body || {};
    if (!grade) return fail(res, 'grade is required.', 422);

    const rows = await query(
      `SELECT s.id, s.student_id, m.title, b.faculty_id
       FROM assignment_submissions s
       JOIN course_materials m ON m.id = s.material_id
       LEFT JOIN batches b ON b.id = m.batch_id
       WHERE s.id = ?`,
      [req.params.submissionId]
    );
    const sub = rows[0];
    if (!sub) return fail(res, 'Submission not found.', 404);

    if (!isAdmin(req)) {
      const faculty = await facultyOf(req.user.id);
      if (!faculty || sub.faculty_id !== faculty.id) {
        return fail(res, 'This submission does not belong to your batch.', 403);
      }
    }

    await query(
      `UPDATE assignment_submissions
       SET grade = ?, feedback = ?, status = 'graded', graded_by = ?, graded_at = NOW()
       WHERE id = ?`,
      [grade, feedback || null, req.user.id, req.params.submissionId]
    );

    const u = await query('SELECT user_id FROM students WHERE id = ? AND user_id IS NOT NULL', [sub.student_id]);
    if (u[0]?.user_id) {
      NotificationService.notifyUser(u[0].user_id, {
        type: 'info',
        title: 'Your submission was graded',
        message: `${sub.title} — grade: ${grade}`,
        link: '/classroom',
      });
    }

    const saved = await query('SELECT * FROM assignment_submissions WHERE id = ?', [req.params.submissionId]);
    return success(res, { data: saved[0] }, 'Submission graded.');
  },
};

module.exports = SubmissionController;

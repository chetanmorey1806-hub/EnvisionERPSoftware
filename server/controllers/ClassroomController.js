/**
 * ClassroomController — classwork & homework (/api/classroom).
 *
 * Publish side (trainer / admin):
 *   A trainer may only publish to a batch assigned to them. An admin may
 *   publish to any batch. That distinction is enforced here, not in the UI.
 *
 * Consume side (student): `/students/me/classroom` returns only the items for
 * batches the student is actively enrolled in.
 */
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');
const NotificationService = require('../services/NotificationService');

const KINDS = ['classwork', 'homework', 'material', 'assignment', 'lab'];
const KIND_LABEL = {
  classwork: 'Classwork', homework: 'Homework', material: 'Material',
  assignment: 'Assignment', lab: 'Lab assignment',
};

/** Faculty row for this user, or null for non-teaching staff/admin. */
async function facultyOf(userId) {
  const rows = await query('SELECT id FROM faculty WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

const isAdmin = (req) => ['admin', 'super_admin'].includes(req.user.role);

const ClassroomController = {
  // GET /classroom?batchId=&type=
  async list(req, res) {
    const { batchId, type } = req.query;
    const where = [];
    const params = [];

    // A trainer sees only their own batches; an admin sees everything.
    if (!isAdmin(req)) {
      const faculty = await facultyOf(req.user.id);
      if (!faculty) return fail(res, 'No faculty profile is linked to this account.', 403);
      where.push('b.faculty_id = ?');
      params.push(faculty.id);
    }
    if (batchId) { where.push('m.batch_id = ?'); params.push(batchId); }
    if (type) { where.push('m.type = ?'); params.push(type); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT m.*, b.name AS batch_name, b.code AS batch_code,
              c.title AS course_name, f.name AS trainer_name
       FROM course_materials m
       LEFT JOIN batches b ON b.id = m.batch_id
       LEFT JOIN courses c ON c.id = m.course_id
       LEFT JOIN faculty f ON f.id = m.faculty_id
       ${clause}
       ORDER BY m.assigned_date DESC, m.id DESC`,
      params
    );
    return success(res, { data: rows }, 'Classroom items fetched.');
  },

  /**
   * POST /classroom  (multipart: documents[] optional)
   * { batch_id, title, type, instructions?, duration_minutes?, assigned_date?, due_date? }
   */
  async create(req, res) {
    const { batch_id, title, type, instructions, duration_minutes, assigned_date, due_date } = req.body || {};
    if (!batch_id || !title) return fail(res, 'batch_id and title are required.', 422);
    if (type && !KINDS.includes(type)) {
      return fail(res, `type must be one of: ${KINDS.join(', ')}.`, 422);
    }
    if (duration_minutes && (Number.isNaN(Number(duration_minutes)) || Number(duration_minutes) <= 0)) {
      return fail(res, 'duration_minutes must be a positive number.', 422);
    }

    const batches = await query('SELECT id, course_id, faculty_id FROM batches WHERE id = ?', [batch_id]);
    const batch = batches[0];
    if (!batch) return fail(res, 'Batch not found.', 404);

    // Ownership: trainers may only publish to their own batches.
    let facultyId = batch.faculty_id;
    if (!isAdmin(req)) {
      const faculty = await facultyOf(req.user.id);
      if (!faculty) return fail(res, 'No faculty profile is linked to this account.', 403);
      if (batch.faculty_id !== faculty.id) {
        return fail(res, 'This batch is not assigned to you.', 403);
      }
      facultyId = faculty.id;
    }

    // The authoritative deadline. Three ways to set it, most precise first:
    //   1. an explicit `due_at` timestamp;
    //   2. a `duration_minutes` — an in-class task due N minutes from NOW;
    //   3. a `due_date` — end of that day (23:59:59).
    // Anything past this becomes "missing" for a student who has not submitted.
    const { due_at } = req.body || {};
    let deadline = null;
    if (due_at) deadline = due_at;
    else if (duration_minutes) deadline = new Date(Date.now() + Number(duration_minutes) * 60000);
    else if (due_date) deadline = `${due_date} 23:59:59`;

    const file = req.files?.[0] || null;
    const result = await query(
      `INSERT INTO course_materials
         (batch_id, course_id, faculty_id, title, instructions, type, duration_minutes,
          assigned_date, due_date, due_at, file_name, file_url, mime_type, size_kb)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?, ?)`,
      [
        batch_id, batch.course_id, facultyId, title, instructions || null,
        type || 'classwork', duration_minutes || null, assigned_date || null,
        due_date || null, deadline,
        file?.originalname || '', file ? `/uploads/documents/${file.filename}` : '',
        file?.mimetype || null, file ? Math.round(file.size / 1024) : 0,
      ]
    );

    // Tell the enrolled students (fire-and-forget; never breaks the upload).
    const students = await query(
      "SELECT student_id FROM student_batches WHERE batch_id = ? AND status = 'enrolled'",
      [batch_id]
    );
    const kind = KIND_LABEL[type || 'classwork'];
    for (const s of students) {
      const u = await query('SELECT user_id FROM students WHERE id = ? AND user_id IS NOT NULL', [s.student_id]);
      if (u[0]?.user_id) {
        NotificationService.notifyUser(u[0].user_id, {
          type: 'info',
          title: `New ${kind.toLowerCase()} posted`,
          message: `${title}${due_date ? ` — due ${due_date}` : ''}`,
          link: '/classroom',
        });
      }
    }

    const rows = await query('SELECT * FROM course_materials WHERE id = ?', [result.insertId]);
    return created(res, { data: rows[0] }, `${kind} published.`);
  },

  // DELETE /classroom/:id
  async remove(req, res) {
    const rows = await query(
      `SELECT m.id, b.faculty_id FROM course_materials m
       LEFT JOIN batches b ON b.id = m.batch_id WHERE m.id = ?`,
      [req.params.id]
    );
    const item = rows[0];
    if (!item) return fail(res, 'Item not found.', 404);

    if (!isAdmin(req)) {
      const faculty = await facultyOf(req.user.id);
      if (!faculty || item.faculty_id !== faculty.id) {
        return fail(res, 'This item does not belong to your batch.', 403);
      }
    }
    await query('DELETE FROM course_materials WHERE id = ?', [req.params.id]);
    return success(res, {}, 'Item removed.');
  },

  // GET /students/me/classroom?type=   (student-scoped)
  async myClassroom(req, res) {
    const { type } = req.query;
    const params = [req.student.id];
    let clause = '';
    if (type) { clause = 'AND m.type = ?'; params.push(type); }

    // The colour on the student's card comes straight from this expression, so
    // it can never disagree with the server:
    //   done    (green) — a submission exists;
    //   missing (red)   — no submission and the deadline has passed;
    //   pending (amber) — no submission, still time.
    const rows = await query(
      `SELECT m.id, m.title, m.instructions, m.type, m.duration_minutes,
              m.assigned_date, m.due_date, m.due_at, m.file_name, m.file_url, m.size_kb,
              b.name AS batch_name, c.title AS course_name, f.name AS trainer_name,
              sub.id AS submission_id, sub.status AS submission_status,
              sub.grade, sub.feedback, sub.submitted_at,
              (m.due_at IS NOT NULL AND m.due_at < NOW()) AS past_due,
              CASE
                WHEN sub.id IS NOT NULL THEN 'done'
                WHEN m.due_at IS NOT NULL AND m.due_at < NOW() THEN 'missing'
                ELSE 'pending'
              END AS computed_status
       FROM course_materials m
       JOIN student_batches sb ON sb.batch_id = m.batch_id AND sb.status = 'enrolled'
       LEFT JOIN batches b ON b.id = m.batch_id
       LEFT JOIN courses c ON c.id = m.course_id
       LEFT JOIN faculty f ON f.id = m.faculty_id
       LEFT JOIN assignment_submissions sub ON sub.material_id = m.id AND sub.student_id = sb.student_id
       WHERE sb.student_id = ? ${clause}
       ORDER BY m.due_at IS NULL, m.due_at ASC, m.id DESC`,
      params
    );
    return success(res, { data: rows }, 'Your classroom items fetched.');
  },
};

module.exports = ClassroomController;

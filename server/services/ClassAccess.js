/**
 * ClassAccess — who is this person to this class?
 *
 * Every /classes endpoint starts here, so the answer is decided once, on the
 * server, from the database — never from anything the client sends.
 *
 *   supervisor  runs the institute (admin, branch head, coordinator) or assists
 *               in every class (teaching assistant): sees and manages every class.
 *   teacher     the trainer assigned to the batch.
 *   student     enrolled in the batch (student_batches, or the batch on their
 *               own record while still active).
 *   null        none of the above — refused.
 */
const { query } = require('../config/db');

const SUPERVISOR_ROLES = ['super_admin', 'admin', 'branch_head', 'coordinator', 'teaching_assistant'];

const isSupervisor = (user) => SUPERVISOR_ROLES.includes(user?.role);

/** SQL fragment: students in batch `?` (bind the batch id twice). */
const ROSTER_WHERE = `((s.batch_id = ? AND s.status = 'active')
  OR EXISTS (SELECT 1 FROM student_batches sb
             WHERE sb.student_id = s.id AND sb.batch_id = ? AND sb.status = 'enrolled'))`;

async function facultyForUser(userId) {
  const rows = await query('SELECT id, name FROM faculty WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

async function studentForUser(userId) {
  const rows = await query('SELECT id, name, email FROM students WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

async function loadBatch(batchId) {
  const rows = await query(
    `SELECT b.id, b.code, b.name, b.course_id, b.faculty_id, b.status, b.capacity,
            b.class_code, b.class_theme, b.class_description, b.class_join_enabled,
            b.start_date, b.end_date, b.timeline,
            c.title AS course_name, f.name AS trainer_name, f.email AS trainer_email,
            f.avatar AS trainer_avatar, f.user_id AS trainer_user_id
     FROM batches b
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN faculty f ON f.id = b.faculty_id
     WHERE b.id = ?`,
    [batchId]
  );
  return rows[0] || null;
}

/** → { batch, role, facultyId?, studentId? }  (batch null when it does not exist) */
async function viewerFor(user, batchId) {
  const batch = await loadBatch(batchId);
  if (!batch) return { batch: null, role: null };
  if (isSupervisor(user)) return { batch, role: 'supervisor' };

  const faculty = await facultyForUser(user.id);
  if (faculty && batch.faculty_id === faculty.id) return { batch, role: 'teacher', facultyId: faculty.id };

  const student = await studentForUser(user.id);
  if (student) {
    const inClass = await query(
      `SELECT s.id FROM students s WHERE s.id = ? AND ${ROSTER_WHERE} LIMIT 1`,
      [student.id, batchId, batchId]
    );
    if (inClass.length) return { batch, role: 'student', studentId: student.id, studentName: student.name };
  }
  return { batch, role: null };
}

const canTeach = (viewer) => viewer.role === 'teacher' || viewer.role === 'supervisor';

async function roster(batchId) {
  return query(
    `SELECT s.id, s.name, s.email, s.phone, s.avatar, s.user_id
     FROM students s WHERE ${ROSTER_WHERE} ORDER BY s.name`,
    [batchId, batchId]
  );
}

module.exports = {
  SUPERVISOR_ROLES, ROSTER_WHERE, isSupervisor, facultyForUser, studentForUser,
  loadBatch, viewerFor, canTeach, roster,
};

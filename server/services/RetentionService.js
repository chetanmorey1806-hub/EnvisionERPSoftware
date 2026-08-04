/**
 * RetentionService — predictive drop-out analytics.
 *
 * Risk signals (any one triggers a review; two make it `high`):
 *   A. N consecutive absences in the most recent sessions of a batch.
 *   B. N consecutive missed submissions on past-due assignments/labs.
 *   C. Attendance percentage below the institute threshold.
 *
 * The result is written back to `students.risk_level` so the Admin dashboard
 * can highlight the profile in red without recomputing on every render.
 */
const { query } = require('../config/db');

const CONSECUTIVE_ABSENCES = Number(process.env.RISK_CONSECUTIVE_ABSENCES) || 3;
const CONSECUTIVE_MISSED = Number(process.env.RISK_CONSECUTIVE_MISSED) || 2;
const ATTENDANCE_THRESHOLD = Number(process.env.ATTENDANCE_THRESHOLD) || 75;

/** Longest run of `absent` at the END of the (date-ordered) attendance list. */
function trailingAbsences(rows) {
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].status === 'absent') n += 1;
    else break;
  }
  return n;
}

async function evaluateStudent(student) {
  const reasons = [];

  // A. consecutive absences (most recent 20 sessions, chronological)
  const attendance = await query(
    'SELECT status FROM attendance WHERE student_id = ? ORDER BY date ASC, id ASC',
    [student.id]
  );
  const streak = trailingAbsences(attendance);
  if (streak >= CONSECUTIVE_ABSENCES) {
    reasons.push(`${streak} consecutive absences`);
  }

  // C. attendance percentage
  let pct = null;
  if (attendance.length) {
    const present = attendance.filter((a) => a.status === 'present').length;
    pct = Math.round((present / attendance.length) * 100);
    if (pct < ATTENDANCE_THRESHOLD) reasons.push(`attendance ${pct}% (< ${ATTENDANCE_THRESHOLD}%)`);
  }

  // B. consecutive missed submissions on past-due work in their batches
  const due = await query(
    `SELECT m.id, m.due_date,
            (SELECT COUNT(*) FROM assignment_submissions s
              WHERE s.material_id = m.id AND s.student_id = ?) AS submitted
     FROM course_materials m
     JOIN student_batches sb ON sb.batch_id = m.batch_id AND sb.student_id = ?
     WHERE sb.status = 'enrolled'
       AND m.type IN ('homework','assignment','lab')
       AND m.due_date IS NOT NULL AND m.due_date < CURDATE()
     ORDER BY m.due_date ASC`,
    [student.id, student.id]
  );
  let missedStreak = 0;
  for (let i = due.length - 1; i >= 0; i -= 1) {
    if (Number(due[i].submitted) === 0) missedStreak += 1;
    else break;
  }
  if (missedStreak >= CONSECUTIVE_MISSED) {
    reasons.push(`${missedStreak} consecutive missed submissions`);
  }

  const level = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'watch' : 'none';
  return { level, reasons, attendancePercent: pct, absenceStreak: streak, missedStreak };
}

/** Recompute risk for every active student and persist it. */
async function recomputeAll() {
  const students = await query("SELECT id, name FROM students WHERE status = 'active'");
  const out = [];

  for (const s of students) {
    const r = await evaluateStudent(s);
    await query(
      'UPDATE students SET risk_level = ?, risk_reason = ?, risk_updated_at = NOW() WHERE id = ?',
      [r.level, r.reasons.join('; ') || null, s.id]
    );
    if (r.level !== 'none') out.push({ id: s.id, name: s.name, ...r });
  }

  out.sort((a, b) => (a.level === 'high' ? -1 : 1));
  return { evaluated: students.length, atRisk: out.length, students: out };
}

/** Current at-risk list (from the stored values). */
function listAtRisk() {
  return query(
    `SELECT s.id, s.name, s.student_uid, s.email, s.phone, s.risk_level, s.risk_reason,
            s.risk_updated_at, b.name AS batch_name
     FROM students s LEFT JOIN batches b ON b.id = s.batch_id
     WHERE s.risk_level <> 'none' AND s.status = 'active'
     ORDER BY FIELD(s.risk_level,'high','watch'), s.name`
  );
}

module.exports = { evaluateStudent, recomputeAll, listAtRisk, CONSECUTIVE_ABSENCES, CONSECUTIVE_MISSED };

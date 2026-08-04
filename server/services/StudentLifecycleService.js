/**
 * StudentLifecycleService — registration → batch assignment → status → exit.
 *
 * Responsibilities
 *   1. generateStudentUid()  gap-free, human-readable institute ID
 *   2. enrollInBatch()       capacity + duplicate + TIMETABLE-OVERLAP validation
 *   3. changeStatus()        guarded transitions, append-only history
 *   4. attachDocument()      enrollment documents (ID proof, photo, …)
 *
 * Overlap rule: two batches conflict when their DATE ranges intersect AND their
 * WEEKDAY sets intersect AND their TIME-of-day ranges intersect. A NULL means
 * "unbounded" for dates and "all" for days/times — the conservative reading, so
 * an unspecified schedule is treated as conflicting rather than silently safe.
 */
const { query } = require('../config/db');
const { withTransaction } = require('../utils/transaction');
const { today } = require('../helpers/dateUtils');
const { parseDays, toMinutes } = require('../helpers/schedule');

const httpError = (message, status, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

/* ------------------------------------------------------------ overlap logic */

/** Half-open interval intersection: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
const rangesIntersect = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const datesIntersect = (a, b) => {
  const aStart = a.start_date ? new Date(a.start_date).getTime() : -Infinity;
  const aEnd = a.end_date ? new Date(a.end_date).getTime() : Infinity;
  const bStart = b.start_date ? new Date(b.start_date).getTime() : -Infinity;
  const bEnd = b.end_date ? new Date(b.end_date).getTime() : Infinity;
  // Inclusive end dates: a batch ending on the same day still conflicts.
  return aStart <= bEnd && bStart <= aEnd;
};

const daysIntersect = (a, b) => {
  const bDays = new Set(parseDays(b.days_of_week));
  return parseDays(a.days_of_week).some((d) => bDays.has(d));
};

const timesIntersect = (a, b) =>
  rangesIntersect(
    toMinutes(a.start_time, 0), toMinutes(a.end_time, 24 * 60),
    toMinutes(b.start_time, 0), toMinutes(b.end_time, 24 * 60)
  );

/** True when a student cannot physically attend both batches. */
function batchesOverlap(a, b) {
  return datesIntersect(a, b) && daysIntersect(a, b) && timesIntersect(a, b);
}

/* ------------------------------------------------------- status transitions */

const ALLOWED_TRANSITIONS = {
  active: ['completed', 'dropped', 'suspended', 'inactive'],
  suspended: ['active', 'dropped'],
  inactive: ['active', 'dropped'],
  dropped: ['active'],          // re-admission
  completed: [],                // terminal
  graduated: [],                // legacy terminal
};

/* ------------------------------------------------------------------ service */

const StudentLifecycleService = {
  batchesOverlap, // exported for tests

  /**
   * Gap-free, human-readable ID: ENV/2026/CS-101/0001
   * Uses SELECT ... FOR UPDATE on id_sequences so concurrent registrations
   * cannot claim the same number.
   */
  async generateStudentUid(courseId, conn = null) {
    const run = async (c) => {
      const year = new Date().getFullYear();
      let courseCode = 'GEN';
      if (courseId) {
        const [rows] = await c.execute('SELECT code FROM courses WHERE id = ?', [courseId]);
        if (rows[0]?.code) courseCode = rows[0].code;
      }
      const scope = `student:${year}:${courseCode}`;

      await c.execute(
        'INSERT INTO id_sequences (scope, next_val) VALUES (?, 1) ON DUPLICATE KEY UPDATE scope = scope',
        [scope]
      );
      const [locked] = await c.execute(
        'SELECT next_val FROM id_sequences WHERE scope = ? FOR UPDATE',
        [scope]
      );
      const seq = locked[0].next_val;
      await c.execute('UPDATE id_sequences SET next_val = next_val + 1 WHERE scope = ?', [scope]);

      return `ENV/${year}/${courseCode}/${String(seq).padStart(4, '0')}`;
    };

    return conn ? run(conn) : withTransaction(run);
  },

  /** Assign a UID to a student that doesn't have one yet. */
  async assignUid(studentId) {
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, course_id, student_uid FROM students WHERE id = ? FOR UPDATE',
        [studentId]
      );
      const student = rows[0];
      if (!student) throw httpError('Student not found.', 404);
      if (student.student_uid) return student.student_uid;

      const uid = await StudentLifecycleService.generateStudentUid(student.course_id, conn);
      await conn.execute('UPDATE students SET student_uid = ? WHERE id = ?', [uid, studentId]);
      return uid;
    });
  },

  /**
   * Enroll a student into a batch.
   * Rejects: unknown/inactive batch, inactive student, duplicate enrollment,
   * full batch, and any timetable overlap with an existing active enrollment.
   */
  async enrollInBatch(studentId, batchId, { enrolledOn } = {}) {
    return withTransaction(async (conn) => {
      const [studentRows] = await conn.execute(
        'SELECT id, name, status FROM students WHERE id = ?', [studentId]
      );
      const student = studentRows[0];
      if (!student) throw httpError('Student not found.', 404);
      if (student.status !== 'active') {
        throw httpError(`Cannot enroll a student with status "${student.status}".`, 409);
      }

      // Lock the batch row so two concurrent enrollments can't both see a free seat.
      const [batchRows] = await conn.execute('SELECT * FROM batches WHERE id = ? FOR UPDATE', [batchId]);
      const target = batchRows[0];
      if (!target) throw httpError('Batch not found.', 404);
      if (target.status !== 'active') throw httpError('Batch is not active.', 409);

      const [dupe] = await conn.execute(
        "SELECT id FROM student_batches WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
        [studentId, batchId]
      );
      if (dupe.length) throw httpError('Student is already enrolled in this batch.', 409);

      // Capacity
      if (Number(target.capacity) > 0) {
        const [capRows] = await conn.execute(
          "SELECT COUNT(*) AS taken FROM student_batches WHERE batch_id = ? AND status = 'enrolled'",
          [batchId]
        );
        if (Number(capRows[0].taken) >= Number(target.capacity)) {
          throw httpError('Batch is at full capacity.', 409);
        }
      }

      // Timetable conflict against every active enrollment
      const [current] = await conn.execute(
        `SELECT b.* FROM student_batches sb
         JOIN batches b ON b.id = sb.batch_id
         WHERE sb.student_id = ? AND sb.status = 'enrolled'`,
        [studentId]
      );
      const conflict = current.find((existing) => batchesOverlap(existing, target));
      if (conflict) {
        throw httpError(
          `Schedule conflict: student is already booked in "${conflict.name}" (${conflict.code}) at an overlapping time.`,
          409,
          {
            conflict: {
              batchId: conflict.id,
              code: conflict.code,
              name: conflict.name,
              days: parseDays(conflict.days_of_week),
              start_time: conflict.start_time,
              end_time: conflict.end_time,
              start_date: conflict.start_date,
              end_date: conflict.end_date,
            },
          }
        );
      }

      const [result] = await conn.execute(
        'INSERT INTO student_batches (student_id, batch_id, enrolled_on) VALUES (?, ?, ?)',
        [studentId, batchId, enrolledOn || today()]
      );
      // Keep the denormalized primary batch pointer in sync.
      await conn.execute('UPDATE students SET batch_id = ? WHERE id = ?', [batchId, studentId]);

      return { enrollmentId: result.insertId, studentId, batchId };
    });
  },

  /** Withdraw a student from a batch (keeps the historical row). */
  async unenroll(studentId, batchId, status = 'dropped') {
    const result = await query(
      "UPDATE student_batches SET status = ?, completed_on = CURDATE() WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
      [status, studentId, batchId]
    );
    if (!result.affectedRows) throw httpError('Active enrollment not found.', 404);
    return true;
  },

  /** Guarded status transition + append-only history row. */
  async changeStatus(studentId, toStatus, { reason = null, changedBy = null } = {}) {
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute('SELECT id, status FROM students WHERE id = ? FOR UPDATE', [studentId]);
      const student = rows[0];
      if (!student) throw httpError('Student not found.', 404);

      const from = student.status;
      if (from === toStatus) throw httpError(`Student is already "${toStatus}".`, 409);

      const allowed = ALLOWED_TRANSITIONS[from] || [];
      if (!allowed.includes(toStatus)) {
        throw httpError(
          `Illegal transition "${from}" -> "${toStatus}". Allowed: ${allowed.join(', ') || 'none (terminal)'}.`,
          422
        );
      }

      await conn.execute('UPDATE students SET status = ? WHERE id = ?', [toStatus, studentId]);
      await conn.execute(
        'INSERT INTO student_status_history (student_id, from_status, to_status, reason, changed_by) VALUES (?, ?, ?, ?, ?)',
        [studentId, from, toStatus, reason, changedBy]
      );

      // Exiting the institute closes the open enrollments too.
      if (['completed', 'dropped'].includes(toStatus)) {
        await conn.execute(
          "UPDATE student_batches SET status = ?, completed_on = CURDATE() WHERE student_id = ? AND status = 'enrolled'",
          [toStatus === 'completed' ? 'completed' : 'dropped', studentId]
        );
      }

      return { studentId, from, to: toStatus };
    });
  },

  /** Persist an uploaded enrollment document. */
  async attachDocument(studentId, { docType, file, uploadedBy }) {
    const id = await query(
      `INSERT INTO student_documents (student_id, doc_type, file_name, file_url, mime_type, size_kb, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        docType || 'other',
        file.originalname,
        `/uploads/documents/${file.filename}`,
        file.mimetype,
        Math.round(file.size / 1024),
        uploadedBy || null,
      ]
    );
    const rows = await query('SELECT * FROM student_documents WHERE id = ?', [id.insertId]);
    return rows[0];
  },

  listDocuments(studentId) {
    return query('SELECT * FROM student_documents WHERE student_id = ? ORDER BY id DESC', [studentId]);
  },

  listEnrollments(studentId) {
    return query(
      `SELECT sb.*, b.code, b.name AS batch_name, b.timeline, b.start_time, b.end_time,
              b.days_of_week, b.start_date, b.end_date, c.title AS course_name
       FROM student_batches sb
       JOIN batches b ON b.id = sb.batch_id
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE sb.student_id = ? ORDER BY sb.id DESC`,
      [studentId]
    );
  },

  statusHistory(studentId) {
    return query(
      `SELECT h.*, u.name AS changed_by_name
       FROM student_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.student_id = ? ORDER BY h.id DESC`,
      [studentId]
    );
  },
};

module.exports = StudentLifecycleService;
module.exports.batchesOverlap = batchesOverlap;

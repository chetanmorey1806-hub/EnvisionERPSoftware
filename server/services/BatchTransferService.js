/**
 * BatchTransferService — the Batch Shifting Engine.
 *
 * Moves a student between batches while PRESERVING HISTORY:
 *   - `attendance` rows keep their original `batch_id`. They are never
 *     rewritten, so the student's past attendance in the old batch stays
 *     intact and auditable.
 *   - The old `student_batches` row is marked `transferred` (not deleted).
 *   - Every move is recorded in `batch_transfers`.
 *
 * The destination is validated exactly like a fresh enrollment: capacity,
 * duplicate, and timetable-overlap against the student's OTHER active batches.
 */
const { withTransaction } = require('../utils/transaction');
const { query } = require('../config/db');
const { batchesOverlap } = require('./StudentLifecycleService');
const { today } = require('../helpers/dateUtils');

const httpError = (message, status, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

async function transferStudent({ studentId, fromBatchId, toBatchId, reason, transferredBy }) {
  if (Number(fromBatchId) === Number(toBatchId)) {
    throw httpError('Source and destination batch are the same.', 422);
  }

  return withTransaction(async (conn) => {
    // 1. The student must be actively enrolled in the source batch.
    const [enr] = await conn.execute(
      "SELECT * FROM student_batches WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
      [studentId, fromBatchId]
    );
    if (!enr[0]) throw httpError('Student is not actively enrolled in the source batch.', 404);

    // 2. Destination must exist and be active. Lock it for the capacity check.
    const [dest] = await conn.execute('SELECT * FROM batches WHERE id = ? FOR UPDATE', [toBatchId]);
    const target = dest[0];
    if (!target) throw httpError('Destination batch not found.', 404);
    if (target.status !== 'active') throw httpError('Destination batch is not active.', 409);

    // 3. Already in the destination?
    const [dupe] = await conn.execute(
      "SELECT id FROM student_batches WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
      [studentId, toBatchId]
    );
    if (dupe.length) throw httpError('Student is already enrolled in the destination batch.', 409);

    // 4. Capacity of the destination.
    if (Number(target.capacity) > 0) {
      const [cap] = await conn.execute(
        "SELECT COUNT(*) AS taken FROM student_batches WHERE batch_id = ? AND status = 'enrolled'",
        [toBatchId]
      );
      if (Number(cap[0].taken) >= Number(target.capacity)) {
        throw httpError('Destination batch is at full capacity.', 409);
      }
    }

    // 5. Timetable clash with the student's OTHER active batches (excluding the one being left).
    const [others] = await conn.execute(
      `SELECT b.* FROM student_batches sb JOIN batches b ON b.id = sb.batch_id
       WHERE sb.student_id = ? AND sb.status = 'enrolled' AND sb.batch_id <> ?`,
      [studentId, fromBatchId]
    );
    const clash = others.find((b) => batchesOverlap(b, target));
    if (clash) {
      throw httpError(
        `Schedule conflict: student is already booked in "${clash.name}" (${clash.code}) at an overlapping time.`,
        409,
        { conflict: { batchId: clash.id, code: clash.code, name: clash.name } }
      );
    }

    // 6. Perform the move. Attendance rows are intentionally left untouched.
    await conn.execute(
      "UPDATE student_batches SET status = 'transferred', completed_on = CURDATE() WHERE id = ?",
      [enr[0].id]
    );
    await conn.execute(
      'INSERT INTO student_batches (student_id, batch_id, enrolled_on) VALUES (?, ?, ?)',
      [studentId, toBatchId, today()]
    );
    await conn.execute('UPDATE students SET batch_id = ? WHERE id = ?', [toBatchId, studentId]);
    await conn.execute(
      'INSERT INTO batch_transfers (student_id, from_batch_id, to_batch_id, reason, transferred_by) VALUES (?, ?, ?, ?, ?)',
      [studentId, fromBatchId, toBatchId, reason || null, transferredBy || null]
    );

    // Attendance history: count what was preserved, for the response.
    const [hist] = await conn.execute(
      'SELECT COUNT(*) AS rows_kept FROM attendance WHERE student_id = ? AND batch_id = ?',
      [studentId, fromBatchId]
    );

    return {
      studentId: Number(studentId),
      fromBatchId: Number(fromBatchId),
      toBatchId: Number(toBatchId),
      attendanceRowsPreserved: Number(hist[0].rows_kept),
    };
  });
}

function transferHistory(studentId) {
  return query(
    `SELECT bt.*, bf.name AS from_batch, bt2.name AS to_batch, u.name AS transferred_by_name
     FROM batch_transfers bt
     JOIN batches bf ON bf.id = bt.from_batch_id
     JOIN batches bt2 ON bt2.id = bt.to_batch_id
     LEFT JOIN users u ON u.id = bt.transferred_by
     WHERE bt.student_id = ? ORDER BY bt.id DESC`,
    [studentId]
  );
}

module.exports = { transferStudent, transferHistory };

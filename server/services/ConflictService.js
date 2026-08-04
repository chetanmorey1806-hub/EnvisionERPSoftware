/**
 * ConflictService — the isolation check that runs BEFORE any batch save.
 *
 * Blocks the operation (409) when:
 *   1. the trainer is already teaching an overlapping batch,
 *   2. the trainer would exceed the admin's max-batches-per-day policy,
 *   3. the classroom/lab is already occupied at that time,
 *   4. the batch capacity exceeds the classroom's physical seating,
 *   5. the timings fall outside the institute's operating hours.
 *
 * All checks are pure functions of the DB — never of client-supplied claims.
 * Errors carry `.status` and `.conflict` so the UI can render an error banner
 * naming the exact clashing entity.
 */
const { query } = require('../config/db');
const { batchesOverlap } = require('./StudentLifecycleService');
const { parseDays, toMinutes } = require('../helpers/schedule');

const conflictError = (message, conflict) =>
  Object.assign(new Error(message), { status: 409, conflict });

/** Admin-configured scheduling policy (single-row settings table). */
async function policy() {
  const rows = await query(
    'SELECT max_batches_per_trainer_per_day, open_time, close_time FROM institution_settings WHERE id = 1'
  );
  return rows[0] || { max_batches_per_trainer_per_day: 4, open_time: '08:00:00', close_time: '21:00:00' };
}

/** 1. Trainer must not be double-booked. */
async function assertTrainerFree(facultyId, target, excludeBatchId = null) {
  if (!facultyId) return;
  const rows = await query(
    "SELECT * FROM batches WHERE faculty_id = ? AND status = 'active' AND id <> ?",
    [facultyId, excludeBatchId || 0]
  );
  const clash = rows.find((b) => batchesOverlap(b, target));
  if (clash) {
    throw conflictError(
      `Scheduling conflict: this trainer already teaches "${clash.name}" (${clash.code}) at an overlapping time.`,
      { type: 'trainer_double_booked', batchId: clash.id, code: clash.code, name: clash.name }
    );
  }
}

/** 2. Trainer must not exceed max batches on any weekday the batch runs. */
async function assertTrainerDailyLimit(facultyId, target, excludeBatchId = null) {
  if (!facultyId) return;
  const { max_batches_per_trainer_per_day: max } = await policy();

  const rows = await query(
    "SELECT * FROM batches WHERE faculty_id = ? AND status = 'active' AND id <> ?",
    [facultyId, excludeBatchId || 0]
  );

  for (const day of parseDays(target.days_of_week)) {
    const sameDay = rows.filter((b) => parseDays(b.days_of_week).includes(day));
    if (sameDay.length + 1 > max) {
      throw conflictError(
        `Policy limit: this trainer is already assigned ${sameDay.length} batches on ${day.toUpperCase()} (maximum ${max} per day).`,
        { type: 'trainer_daily_limit', day, current: sameDay.length, max }
      );
    }
  }
}

/** 3 + 4. Classroom must be free at that time and large enough. */
async function assertClassroomAvailable(classroomId, target, excludeBatchId = null) {
  if (!classroomId) return;

  const rooms = await query('SELECT * FROM classrooms WHERE id = ?', [classroomId]);
  const room = rooms[0];
  if (!room) throw conflictError('Classroom not found.', { type: 'classroom_missing' });
  if (room.status !== 'active') {
    throw conflictError(`Classroom ${room.code} is inactive.`, { type: 'classroom_inactive' });
  }

  // Physical seating capacity
  const wanted = Number(target.capacity || 0);
  if (room.capacity > 0 && wanted > room.capacity) {
    throw conflictError(
      `Capacity exceeded: ${room.code} seats ${room.capacity}, but this batch is configured for ${wanted}.`,
      { type: 'classroom_capacity', room: room.code, seats: room.capacity, requested: wanted }
    );
  }

  // Double-booking of the room
  const rows = await query(
    "SELECT * FROM batches WHERE classroom_id = ? AND status = 'active' AND id <> ?",
    [classroomId, excludeBatchId || 0]
  );
  const clash = rows.find((b) => batchesOverlap(b, target));
  if (clash) {
    throw conflictError(
      `Room conflict: ${room.code} is occupied by "${clash.name}" (${clash.code}) at an overlapping time.`,
      { type: 'classroom_double_booked', room: room.code, batchId: clash.id, code: clash.code }
    );
  }
}

/** 5. Batch timings must sit inside the institute's operating hours. */
async function assertWithinOperatingHours(target) {
  if (!target.start_time || !target.end_time) return; // unspecified: nothing to check
  const { open_time, close_time } = await policy();

  const start = toMinutes(target.start_time);
  const end = toMinutes(target.end_time);
  const open = toMinutes(open_time);
  const close = toMinutes(close_time);

  if (end <= start) {
    throw conflictError('End time must be after start time.', { type: 'invalid_times' });
  }
  if (start < open || end > close) {
    throw conflictError(
      `Outside operating hours: the institute runs ${String(open_time).slice(0, 5)}–${String(close_time).slice(0, 5)}.`,
      { type: 'operating_hours', open: open_time, close: close_time }
    );
  }
}

/**
 * Run every check for a batch about to be saved.
 * `target` = the prospective batch row (merged create/update payload).
 */
async function assertBatchSchedulable(target, { excludeBatchId = null } = {}) {
  await assertWithinOperatingHours(target);
  await assertTrainerFree(target.faculty_id, target, excludeBatchId);
  await assertTrainerDailyLimit(target.faculty_id, target, excludeBatchId);
  await assertClassroomAvailable(target.classroom_id, target, excludeBatchId);
}

module.exports = {
  policy,
  assertTrainerFree,
  assertTrainerDailyLimit,
  assertClassroomAvailable,
  assertWithinOperatingHours,
  assertBatchSchedulable,
};

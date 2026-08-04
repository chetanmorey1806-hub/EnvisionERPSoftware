/**
 * CourseSetupService — "Admin adds a new course, with everything."
 *
 * A COURSE is the curriculum (code, title, duration, fee, syllabus).
 * A BATCH is a scheduled run of it (start/end date, daily timings, weekdays,
 * trainer, classroom). Dates and trainers therefore belong to the batch — but
 * the admin fills one form, so this service creates BOTH atomically.
 *
 * The schedule is validated by the Conflict Resolution Engine BEFORE anything
 * is written. If the trainer is double-booked or the lab is full, nothing is
 * created — no orphan course left behind.
 */
const { withTransaction } = require('../utils/transaction');
const { query } = require('../config/db');
const { assertBatchSchedulable } = require('./ConflictService');
const EmailTriggerService = require('./EmailTriggerService');

const httpError = (message, status, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

const COURSE_FIELDS = ['code', 'title', 'credits', 'department', 'duration', 'fee', 'description'];
const BATCH_FIELDS = [
  'code', 'name', 'faculty_id', 'classroom_id', 'timeline',
  'start_time', 'end_time', 'days_of_week', 'start_date', 'end_date', 'capacity',
];

const pick = (src = {}, keys) =>
  keys.reduce((acc, k) => (src[k] !== undefined && src[k] !== '' ? { ...acc, [k]: src[k] } : acc), {});

/**
 * @param {object} payload { course: {...}, batch?: {...} }
 * Creating the batch is optional — an admin may register the curriculum first
 * and schedule it later.
 */
async function createCourseWithSchedule(payload, { createdBy } = {}) {
  const course = pick(payload.course || {}, COURSE_FIELDS);
  if (!course.code || !course.title) {
    throw httpError('Course code and title are required.', 422);
  }

  const dupe = await query('SELECT id FROM courses WHERE code = ? LIMIT 1', [course.code]);
  if (dupe.length) throw httpError(`A course with code "${course.code}" already exists.`, 409);

  const wantsBatch = !!payload.batch && (payload.batch.code || payload.batch.name);
  let batch = null;

  if (wantsBatch) {
    batch = pick(payload.batch, BATCH_FIELDS);
    if (!batch.code || !batch.name) {
      throw httpError('Batch code and name are required when scheduling the course.', 422);
    }
    const bd = await query('SELECT id FROM batches WHERE code = ? LIMIT 1', [batch.code]);
    if (bd.length) throw httpError(`A batch with code "${batch.code}" already exists.`, 409);

    if (batch.start_date && batch.end_date && batch.end_date < batch.start_date) {
      throw httpError('Batch end date cannot be before the start date.', 422);
    }

    // Conflict Resolution Engine — runs BEFORE any INSERT.
    // Throws 409 with `.conflict` naming the clashing trainer/room.
    await assertBatchSchedulable(batch);
  }

  const result = await withTransaction(async (conn) => {
    const ck = Object.keys(course);
    const [c] = await conn.execute(
      `INSERT INTO courses (${ck.map((k) => `\`${k}\``).join(', ')}) VALUES (${ck.map(() => '?').join(', ')})`,
      ck.map((k) => course[k])
    );
    const courseId = c.insertId;

    let batchId = null;
    if (wantsBatch) {
      const row = { ...batch, course_id: courseId };
      if (Array.isArray(row.days_of_week)) row.days_of_week = JSON.stringify(row.days_of_week);
      const bk = Object.keys(row);
      const [b] = await conn.execute(
        `INSERT INTO batches (${bk.map((k) => `\`${k}\``).join(', ')}) VALUES (${bk.map(() => '?').join(', ')})`,
        bk.map((k) => row[k])
      );
      batchId = b.insertId;
    }

    // Optional syllabus topics, in one go.
    const topics = Array.isArray(payload.syllabus) ? payload.syllabus : [];
    for (const [i, t] of topics.entries()) {
      if (!t?.topic) continue;
      await conn.execute(
        'INSERT INTO course_syllabus (course_id, seq, topic, hours) VALUES (?, ?, ?, ?)',
        [courseId, i + 1, t.topic, t.hours || null]
      );
    }

    return { courseId, batchId, topics: topics.length };
  });

  // Tell the trainer they've been allocated (fire-and-forget).
  if (result.batchId && batch?.faculty_id) {
    EmailTriggerService.batchAssignment(batch.faculty_id, result.batchId, { triggeredBy: createdBy })
      .catch(() => {});
  }

  const [created] = await query('SELECT * FROM courses WHERE id = ?', [result.courseId]);
  const scheduled = result.batchId
    ? (await query(
      `SELECT b.*, f.name AS trainer_name, r.code AS classroom_code
       FROM batches b LEFT JOIN faculty f ON f.id = b.faculty_id
       LEFT JOIN classrooms r ON r.id = b.classroom_id WHERE b.id = ?`,
      [result.batchId]
    ))[0]
    : null;

  return { course: created, batch: scheduled, syllabusTopics: result.topics };
}

module.exports = { createCourseWithSchedule };

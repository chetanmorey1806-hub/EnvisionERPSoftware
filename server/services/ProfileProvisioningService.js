/**
 * ProfileProvisioningService — gives a freshly-verified account its DOMAIN row.
 *
 * A `users` row only grants login. The portals resolve identity from the domain
 * table (`faculty.user_id` / `students.user_id`), so without this step a
 * self-registered trainer can sign in and then 403 on every trainer endpoint.
 *
 * Idempotent, and it LINKS rather than duplicates: if a profile already exists
 * with the same email (e.g. an admin pre-created the trainer), that row is
 * claimed instead of creating a second one.
 */
const { query } = require('../config/db');
const { admissionNo } = require('../helpers/generators');
const { nextNumber } = require('../helpers/numbering');
const { today } = require('../helpers/dateUtils');
const logger = require('../logs/logger');

async function provisionFaculty(user) {
  // Already linked? Nothing to do.
  const linked = await query('SELECT id FROM faculty WHERE user_id = ? LIMIT 1', [user.id]);
  if (linked[0]) return linked[0].id;

  const existing = await query('SELECT id, user_id FROM faculty WHERE email = ? LIMIT 1', [user.email]);

  if (existing[0]) {
    if (!existing[0].user_id) {
      await query('UPDATE faculty SET user_id = ? WHERE id = ?', [user.id, existing[0].id]);
      logger.info(`[provision] linked user ${user.id} to existing faculty ${existing[0].id}`);
    }
    return existing[0].id;
  }

  const r = await query(
    `INSERT INTO faculty (user_id, name, email, phone, status, joined_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [user.id, user.name, user.email, user.phone || null, today()]
  );
  logger.info(`[provision] created faculty ${r.insertId} for user ${user.id}`);
  return r.insertId;
}

async function provisionStudent(user) {
  // Already linked? Nothing to do.
  const linked = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.id]);
  if (linked[0]) return linked[0].id;

  const existing = await query('SELECT id, user_id FROM students WHERE email = ? LIMIT 1', [user.email]);

  if (existing[0]) {
    if (!existing[0].user_id) {
      await query('UPDATE students SET user_id = ? WHERE id = ?', [user.id, existing[0].id]);
      logger.info(`[provision] linked user ${user.id} to existing student ${existing[0].id}`);
    }
    return existing[0].id;
  }

  const r = await query(
    `INSERT INTO students (user_id, name, email, phone, admission_no, admission_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [user.id, user.name, user.email, user.phone || null,
      (await nextNumber('admission')) || admissionNo(), today()]
  );
  logger.info(`[provision] created student ${r.insertId} for user ${user.id}`);
  return r.insertId;
}

/** Called once, right after email verification succeeds. Never throws. */
async function provisionProfile(user) {
  try {
    if (user.role === 'faculty') return { type: 'faculty', id: await provisionFaculty(user) };
    if (user.role === 'student') return { type: 'student', id: await provisionStudent(user) };
    return { type: user.role, id: null }; // staff/admin need no domain row
  } catch (err) {
    logger.error(`[provision] failed for user ${user.id}: ${err.message}`);
    return { type: user.role, id: null, error: err.message };
  }
}

module.exports = { provisionProfile, provisionFaculty, provisionStudent };

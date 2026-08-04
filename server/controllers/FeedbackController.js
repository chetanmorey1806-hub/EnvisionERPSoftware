/**
 * FeedbackController — anonymous student ratings of trainers.
 *
 * ANONYMITY IS AN INVARIANT. `trainer_feedback.student_id` exists only to
 * enforce one response per student per cycle (UNIQUE key). It must NEVER appear
 * in a SELECT reachable by an admin or a trainer. Every query below returns
 * aggregates and free text only.
 *
 * Trainers cannot read this module at all (no `feedback.view` grant) — ratings
 * bypass the trainer and land on the Admin dashboard.
 */
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');
const NotificationService = require('../services/NotificationService');
const Escalation = require('../services/FeedbackEscalationService');

const METRICS = ['clarity', 'punctuality', 'lab_support', 'doubt_resolution'];
const LOW_RATING_THRESHOLD = Number(process.env.LOW_RATING_THRESHOLD) || 3.5;

/** Current feedback window, e.g. '2026-07'. */
const currentCycle = () => new Date().toISOString().slice(0, 7);

const FeedbackController = {
  /**
   * GET /students/me/feedback/pending
   * Trainers of the student's active batches they haven't yet rated this cycle.
   */
  async pending(req, res) {
    const cycle = currentCycle();
    const rows = await query(
      `SELECT b.id AS batch_id, b.name AS batch_name, f.id AS faculty_id, f.name AS trainer_name,
              c.title AS course_name
       FROM student_batches sb
       JOIN batches b ON b.id = sb.batch_id
       JOIN faculty f ON f.id = b.faculty_id
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE sb.student_id = ? AND sb.status = 'enrolled'
         AND NOT EXISTS (
           SELECT 1 FROM trainer_feedback tf
           WHERE tf.student_id = sb.student_id AND tf.batch_id = b.id
             AND tf.faculty_id = f.id AND tf.cycle = ?
         )`,
      [req.student.id, cycle]
    );
    return success(res, { data: { cycle, pending: rows } }, 'Pending feedback fetched.');
  },

  /**
   * POST /students/me/feedback
   * { faculty_id, batch_id, clarity, punctuality, lab_support, doubt_resolution, comments? }
   */
  async submit(req, res) {
    const body = req.body || {};
    const { faculty_id, batch_id, comments } = body;
    if (!faculty_id || !batch_id) return fail(res, 'faculty_id and batch_id are required.', 422);

    for (const m of METRICS) {
      const v = Number(body[m]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return fail(res, `${m} must be an integer between 1 and 5.`, 422);
      }
    }

    // The student must actually be enrolled in that batch, taught by that trainer.
    const ok = await query(
      `SELECT 1 FROM student_batches sb JOIN batches b ON b.id = sb.batch_id
       WHERE sb.student_id = ? AND sb.batch_id = ? AND b.faculty_id = ? AND sb.status = 'enrolled'`,
      [req.student.id, batch_id, faculty_id]
    );
    if (!ok.length) return fail(res, 'You are not enrolled in this trainer’s batch.', 403);

    const cycle = currentCycle();
    const dupe = await query(
      'SELECT id FROM trainer_feedback WHERE student_id = ? AND faculty_id = ? AND batch_id = ? AND cycle = ?',
      [req.student.id, faculty_id, batch_id, cycle]
    );
    if (dupe.length) return fail(res, 'You have already submitted feedback for this cycle.', 409);

    const overall = (Number(body.clarity) + Number(body.punctuality) +
                     Number(body.lab_support) + Number(body.doubt_resolution)) / 4;
    const { escalated, reason } = Escalation.evaluate({ overall, comments });

    const r = await query(
      `INSERT INTO trainer_feedback
         (faculty_id, batch_id, student_id, cycle, clarity, punctuality, lab_support, doubt_resolution,
          comments, escalated, escalation_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, batch_id, req.student.id, cycle,
        body.clarity, body.punctuality, body.lab_support, body.doubt_resolution,
        comments || null, escalated ? 1 : 0, reason]
    );

    if (escalated) {
      // Admins only. The trainer has no feedback.view grant, so they never see it.
      const admins = await query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND status='active'");
      const trainer = await query('SELECT name FROM faculty WHERE id = ?', [faculty_id]);
      for (const a of admins) {
        NotificationService.notifyUser(a.id, {
          type: 'warning',
          title: 'Feedback escalated',
          message: `Anonymous feedback for ${trainer[0]?.name || 'a trainer'} — ${reason}`,
          link: '/trainer-performance',
        });
      }
    }

    // Deliberately returns nothing identifying — not even the row id.
    return created(res, {}, 'Thank you. Your anonymous feedback was recorded.');
  },

  /**
   * GET /admin/feedback/trainers?cycle=YYYY-MM
   *
   * THE UNIFIED ADMIN SUMMARY VIEW — joins Trainers x Batches x Feedback.
   *
   * Feedback aggregates come from a DERIVED TABLE, not a flat multi-JOIN.
   * Joining `batches` AND `trainer_feedback` onto `faculty` in one query
   * multiplies rows (each feedback row repeats once per batch), silently
   * inflating COUNT() and SUM(). Pre-aggregating per faculty_id avoids that.
   */
  async trainerSummary(req, res) {
    const cycle = req.query.cycle || null;

    const rows = await query(
      `SELECT
         f.id            AS trainer_id,
         f.name          AS trainer_name,
         f.email         AS trainer_email,
         f.department,
         f.specialization,
         (SELECT COUNT(*) FROM batches b
            WHERE b.faculty_id = f.id AND b.status = 'active')       AS active_batches,
         (SELECT COUNT(*) FROM student_batches sb
            JOIN batches b2 ON b2.id = sb.batch_id
            WHERE b2.faculty_id = f.id AND sb.status = 'enrolled')   AS students_taught,
         COALESCE(agg.responses, 0)      AS responses,
         agg.avg_clarity,
         agg.avg_punctuality,
         agg.avg_lab_support,
         agg.avg_doubt_resolution,
         agg.avg_rating,
         (agg.avg_rating IS NOT NULL AND agg.avg_rating < ?) AS needs_attention
       FROM faculty f
       LEFT JOIN (
         SELECT faculty_id,
                COUNT(*)                          AS responses,
                ROUND(AVG(clarity), 2)            AS avg_clarity,
                ROUND(AVG(punctuality), 2)        AS avg_punctuality,
                ROUND(AVG(lab_support), 2)        AS avg_lab_support,
                ROUND(AVG(doubt_resolution), 2)   AS avg_doubt_resolution,
                ROUND(AVG(overall), 2)            AS avg_rating
         FROM trainer_feedback
         WHERE (? IS NULL OR cycle = ?)
         GROUP BY faculty_id
       ) agg ON agg.faculty_id = f.id
       WHERE f.status = 'active'
       ORDER BY agg.avg_rating IS NULL, agg.avg_rating ASC`,
      [LOW_RATING_THRESHOLD, cycle, cycle]
    );

    return success(
      res,
      { data: { cycle: cycle || 'all-time', threshold: LOW_RATING_THRESHOLD, trainers: rows } },
      'Trainer feedback summary fetched.'
    );
  },

  /** GET /admin/feedback/escalations — flagged responses, admin-only, anonymous. */
  async escalations(req, res) {
    const rows = await query(
      `SELECT tf.id, tf.cycle, tf.overall, tf.comments, tf.escalation_reason, tf.created_at,
              f.id AS trainer_id, f.name AS trainer_name, b.name AS batch_name
       FROM trainer_feedback tf
       JOIN faculty f ON f.id = tf.faculty_id
       LEFT JOIN batches b ON b.id = tf.batch_id
       WHERE tf.escalated = 1
       ORDER BY tf.id DESC LIMIT 100`
    );
    return success(res, { data: rows }, 'Escalated feedback fetched.');
  },

  /** GET /admin/feedback/trainers/:facultyId/comments — anonymous free text only. */
  async trainerComments(req, res) {
    const rows = await query(
      `SELECT tf.cycle, tf.overall, tf.comments, tf.created_at, b.name AS batch_name
       FROM trainer_feedback tf
       LEFT JOIN batches b ON b.id = tf.batch_id
       WHERE tf.faculty_id = ? AND tf.comments IS NOT NULL AND tf.comments <> ''
       ORDER BY tf.id DESC LIMIT 100`,
      [req.params.facultyId]
    );
    return success(res, { data: rows }, 'Anonymous comments fetched.');
  },
};

module.exports = { FeedbackController, LOW_RATING_THRESHOLD, currentCycle };

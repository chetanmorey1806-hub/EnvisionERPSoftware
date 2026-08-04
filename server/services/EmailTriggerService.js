/**
 * EmailTriggerService — the Admin/CEO communication engine.
 *
 * Every trigger:
 *   1. runs a query that IS the audience (no client-supplied recipient lists),
 *   2. renders a template with the recipient's own data,
 *   3. sends via Nodemailer (config/mail), and
 *   4. writes an `email_logs` row — sent | logged | failed.
 *
 * Idempotency: each trigger is safe to re-run, but re-running sends again.
 * The daily runner guards with `alreadySentToday()` so a cron retry does not
 * spam a student twice.
 */
const { query } = require('../config/db');
const { sendMail } = require('../config/mail');
const logger = require('../logs/logger');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ATTENDANCE_THRESHOLD = Number(process.env.ATTENDANCE_THRESHOLD) || 75;
const LOW_RATING_THRESHOLD = Number(process.env.LOW_RATING_THRESHOLD) || 3.5;
const FEE_DUE_WINDOW_DAYS = Number(process.env.FEE_DUE_WINDOW_DAYS) || 7;

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** Has this exact template already gone to this recipient today? */
async function alreadySentToday(template, email) {
  const rows = await query(
    `SELECT id FROM email_logs
     WHERE template = ? AND recipient_email = ? AND DATE(created_at) = CURDATE()
       AND status <> 'failed' LIMIT 1`,
    [template, email]
  );
  return rows.length > 0;
}

/** Send + audit. Never throws — a failed email must not abort a batch run. */
async function deliver({ template, to, subject, text, html, recipientType, recipientId, meta, triggeredBy }) {
  let status = 'logged';
  let error = null;
  try {
    const result = await sendMail({ to, subject, text, html });
    status = result.sent ? 'sent' : 'logged';
  } catch (err) {
    status = 'failed';
    error = err.message.slice(0, 250);
    logger.error(`[email] ${template} -> ${to} failed: ${err.message}`);
  }

  await query(
    `INSERT INTO email_logs (template, recipient_type, recipient_id, recipient_email, subject, status, error, meta, triggered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [template, recipientType || 'other', recipientId || null, to, subject.slice(0, 200), status, error,
      meta ? JSON.stringify(meta) : null, triggeredBy || null]
  );
  return status;
}

const wrap = (body) =>
  `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#222">${body}` +
  `<hr style="border:none;border-top:1px solid #eee;margin:20px 0">` +
  `<p style="color:#888;font-size:12px">Envision Computer Training Institute, Pune · An ISO 9001:2015 Certified Company</p></div>`;

const EmailTriggerService = {
  ATTENDANCE_THRESHOLD,
  LOW_RATING_THRESHOLD,

  /**
   * FEE DUE REMINDER — students with an outstanding balance.
   * Audience is derived from fee_structures vs fee_transactions.
   */
  async feeReminders({ triggeredBy = null, dryRun = false } = {}) {
    const rows = await query(
      `SELECT s.id, s.name, s.email, c.title AS course_name,
              (fs.total_amount - fs.discount) AS payable,
              COALESCE((SELECT SUM(t.amount) FROM fee_transactions t WHERE t.student_id = s.id), 0) AS paid
       FROM students s
       JOIN fee_structures fs ON fs.student_id = s.id
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE s.status = 'active' AND s.email IS NOT NULL
       HAVING (payable - paid) > 0`
    );

    const results = [];
    for (const r of rows) {
      const due = Number(r.payable) - Number(r.paid);
      if (dryRun) { results.push({ to: r.email, due }); continue; }
      if (await alreadySentToday('fee_reminder', r.email)) continue;

      const subject = `Fee reminder — ${money(due)} outstanding`;
      const text =
        `Dear ${r.name},\n\nYour outstanding balance for the ${r.course_name || 'course'} is ${money(due)}.\n` +
        `Please pay at the front desk or through the online portal.\n\n${CLIENT_URL}/fees`;
      const status = await deliver({
        template: 'fee_reminder', to: r.email, subject, text,
        html: wrap(`<p>Dear <b>${r.name}</b>,</p><p>Your outstanding balance for the <b>${r.course_name || 'course'}</b> is <b>${money(due)}</b>.</p>
          <p>Please pay at the front desk or through the <a href="${CLIENT_URL}/fees">online portal</a>.</p>`),
        recipientType: 'student', recipientId: r.id, meta: { due }, triggeredBy,
      });
      results.push({ to: r.email, due, status });
    }
    return { template: 'fee_reminder', audience: rows.length, sent: results.length, results };
  },

  /**
   * ATTENDANCE WARNING — students below the attendance threshold.
   */
  async attendanceWarnings({ triggeredBy = null, dryRun = false } = {}) {
    const rows = await query(
      `SELECT s.id, s.name, s.email, b.name AS batch_name,
              COUNT(a.id) AS total,
              SUM(a.status = 'present') AS present,
              ROUND(100 * SUM(a.status = 'present') / COUNT(a.id), 0) AS percentage
       FROM students s
       JOIN attendance a ON a.student_id = s.id
       LEFT JOIN batches b ON b.id = a.batch_id
       WHERE s.status = 'active' AND s.email IS NOT NULL
       GROUP BY s.id, b.id
       HAVING total > 0 AND percentage < ?`,
      [ATTENDANCE_THRESHOLD]
    );

    const results = [];
    for (const r of rows) {
      if (dryRun) { results.push({ to: r.email, percentage: r.percentage }); continue; }
      if (await alreadySentToday('attendance_warning', r.email)) continue;

      const subject = `Attendance warning — ${r.percentage}% in ${r.batch_name || 'your batch'}`;
      const text =
        `Hi ${r.name},\n\nYour attendance in ${r.batch_name || 'your batch'} has dropped to ${r.percentage}% ` +
        `(minimum required: ${ATTENDANCE_THRESHOLD}%). You risk losing certification eligibility. ` +
        `Please meet the center head.`;
      const status = await deliver({
        template: 'attendance_warning', to: r.email, subject, text,
        html: wrap(`<p>Hi <b>${r.name}</b>,</p><p>Your attendance in <b>${r.batch_name || 'your batch'}</b> has dropped to
          <b style="color:#e11d48">${r.percentage}%</b> (minimum required: ${ATTENDANCE_THRESHOLD}%).</p>
          <p>You risk losing your certification eligibility. Please meet the center head.</p>`),
        recipientType: 'student', recipientId: r.id,
        meta: { percentage: r.percentage, batch: r.batch_name }, triggeredBy,
      });
      results.push({ to: r.email, percentage: r.percentage, status });
    }
    return { template: 'attendance_warning', audience: rows.length, sent: results.length, results };
  },

  /**
   * LOW FEEDBACK ALERT — trainers whose average rating dipped below threshold.
   * Sent to the TRAINER (trainer_email); the ratings themselves stay anonymous.
   */
  async lowFeedbackAlerts({ triggeredBy = null, minResponses = 3, dryRun = false } = {}) {
    const rows = await query(
      `SELECT f.id, f.name, f.email,
              COUNT(tf.id) AS responses,
              ROUND(AVG(tf.overall), 2) AS avg_rating,
              (SELECT b.name FROM batches b WHERE b.faculty_id = f.id AND b.status='active' LIMIT 1) AS batch_name
       FROM faculty f
       JOIN trainer_feedback tf ON tf.faculty_id = f.id
       WHERE f.status = 'active' AND f.email IS NOT NULL
       GROUP BY f.id
       HAVING responses >= ? AND avg_rating < ?`,
      [minResponses, LOW_RATING_THRESHOLD]
    );

    const results = [];
    for (const r of rows) {
      if (dryRun) { results.push({ to: r.email, avg_rating: r.avg_rating }); continue; }
      if (await alreadySentToday('low_feedback_alert', r.email)) continue;

      const subject = `Batch feedback review — ${r.batch_name || 'your batch'}`;
      const text =
        `Dear ${r.name},\n\nWe noticed the latest batch feedback for ${r.batch_name || 'your batch'} ` +
        `has dipped to ${r.avg_rating}/5 across ${r.responses} responses. ` +
        `Please meet the center head today at 4 PM to discuss adjustments.`;
      const status = await deliver({
        template: 'low_feedback_alert', to: r.email, subject, text,
        html: wrap(`<p>Dear <b>${r.name}</b>,</p><p>We noticed the latest batch feedback for
          <b>${r.batch_name || 'your batch'}</b> has dipped to <b>${r.avg_rating}/5</b> across ${r.responses} responses.</p>
          <p>Please meet the center head today at 4 PM to discuss adjustments.</p>`),
        recipientType: 'trainer', recipientId: r.id,
        meta: { avg_rating: r.avg_rating, responses: r.responses }, triggeredBy,
      });
      results.push({ to: r.email, avg_rating: r.avg_rating, status });
    }
    return { template: 'low_feedback_alert', audience: rows.length, sent: results.length, results };
  },

  /** BATCH ASSIGNMENT — fired when a trainer is allocated a batch. */
  async batchAssignment(facultyId, batchId, { triggeredBy = null } = {}) {
    const rows = await query(
      `SELECT f.id, f.name, f.email, b.name AS batch_name, b.code, b.start_time, b.timeline,
              c.title AS course_name
       FROM faculty f JOIN batches b ON b.id = ?
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE f.id = ? LIMIT 1`,
      [batchId, facultyId]
    );
    const r = rows[0];
    if (!r?.email) return { skipped: 'no trainer email' };

    const subject = `You have been assigned to ${r.course_name || r.batch_name}`;
    const text =
      `Hello ${r.name},\n\nYou have been assigned to ${r.course_name || r.batch_name} (${r.code}) ` +
      `starting ${r.timeline || 'soon'}. View your student roster: ${CLIENT_URL}/instructor`;
    const status = await deliver({
      template: 'batch_assignment', to: r.email, subject, text,
      html: wrap(`<p>Hello <b>${r.name}</b>,</p><p>You have been assigned to <b>${r.course_name || r.batch_name}</b>
        (${r.code}) — ${r.timeline || 'schedule to be confirmed'}.</p>
        <p><a href="${CLIENT_URL}/instructor">View your student roster</a></p>`),
      recipientType: 'trainer', recipientId: r.id, meta: { batchId }, triggeredBy,
    });
    return { template: 'batch_assignment', to: r.email, status };
  },

  /** ISSUE ESCALATION — admin forwards a student complaint to the trainer. */
  async issueEscalation({ facultyId, studentName, message, triggeredBy = null }) {
    const rows = await query('SELECT id, name, email FROM faculty WHERE id = ?', [facultyId]);
    const r = rows[0];
    if (!r?.email) return { skipped: 'no trainer email' };

    const subject = 'Student issue escalation';
    const text = `Hi ${r.name},\n\nStudent ${studentName} reported: ${message}\n\nPlease coordinate with the IT admin.`;
    const status = await deliver({
      template: 'issue_escalation', to: r.email, subject, text,
      html: wrap(`<p>Hi <b>${r.name}</b>,</p><p>Student <b>${studentName}</b> reported: ${message}</p>
        <p>Please coordinate with the IT admin.</p>`),
      recipientType: 'trainer', recipientId: r.id, meta: { studentName }, triggeredBy,
    });
    return { template: 'issue_escalation', to: r.email, status };
  },

  /** BROADCAST — placements / announcements to a student audience. */
  async broadcast({ subject, message, audience = 'active', triggeredBy = null }) {
    const filters = {
      active: "s.status = 'active'",
      alumni: "s.status IN ('completed','graduated')",
      all: "s.status <> 'dropped'",
    };
    const where = filters[audience] || filters.active;

    const rows = await query(
      `SELECT s.id, s.name, s.email FROM students s WHERE ${where} AND s.email IS NOT NULL`
    );

    const results = [];
    for (const r of rows) {
      const status = await deliver({
        template: 'broadcast', to: r.email, subject,
        text: `Hi ${r.name},\n\n${message}\n\n${CLIENT_URL}`,
        html: wrap(`<p>Hi <b>${r.name}</b>,</p><p>${String(message).replace(/\n/g, '<br>')}</p>
          <p><a href="${CLIENT_URL}">Open your portal</a></p>`),
        recipientType: 'student', recipientId: r.id, meta: { audience }, triggeredBy,
      });
      results.push({ to: r.email, status });
    }
    return { template: 'broadcast', audience: rows.length, sent: results.length, results };
  },

  /** The nightly/monthly cron entry point. */
  async runDaily({ triggeredBy = null } = {}) {
    const out = {};
    out.feeReminders = await EmailTriggerService.feeReminders({ triggeredBy });
    out.attendanceWarnings = await EmailTriggerService.attendanceWarnings({ triggeredBy });
    out.lowFeedbackAlerts = await EmailTriggerService.lowFeedbackAlerts({ triggeredBy });
    logger.info(`[email:daily] fee=${out.feeReminders.sent} attendance=${out.attendanceWarnings.sent} feedback=${out.lowFeedbackAlerts.sent}`);
    return out;
  },
};

module.exports = EmailTriggerService;

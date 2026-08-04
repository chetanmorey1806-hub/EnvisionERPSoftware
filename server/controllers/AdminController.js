/**
 * AdminController — the Admin/CEO command center.
 *   /admin/summary            unified operations + finance snapshot
 *   /admin/financials         cash flow, pending fees, payroll, P&L
 *   /admin/emails/*           manual + automated communication triggers
 *   /admin/emails/logs        audit of everything the ERP has sent
 *   /admin/leaves             trainer leave approvals
 */
const { query } = require('../config/db');
const EmailTriggerService = require('../services/EmailTriggerService');
const RetentionService = require('../services/RetentionService');
const { transferStudent, transferHistory } = require('../services/BatchTransferService');
const PacingService = require('../services/PacingService');
const scheduler = require('../jobs/scheduler');
const { success, fail } = require('../utils/response');

const one = async (sql, params = []) => (await query(sql, params))[0];

const AdminController = {
  /** GET /admin/summary — everything the CEO looks at first. */
  async summary(req, res) {
    const [students, trainers, fees, feesMonth, expected, payroll, feedback, leaves] = await Promise.all([
      one("SELECT COUNT(*) total, SUM(status='active') active, SUM(status='suspended') suspended FROM students"),
      one("SELECT COUNT(*) total, SUM(status='active') active FROM faculty"),
      one('SELECT COALESCE(SUM(amount),0) collected, COUNT(*) transactions FROM fee_transactions'),
      one(`SELECT COALESCE(SUM(amount),0) collected FROM fee_transactions
           WHERE YEAR(paid_at)=YEAR(CURDATE()) AND MONTH(paid_at)=MONTH(CURDATE())`),
      one('SELECT COALESCE(SUM(total_amount - discount),0) payable FROM fee_structures'),
      one(`SELECT COALESCE(SUM(CASE WHEN salary_type='monthly' THEN salary_rate ELSE 0 END),0) monthly_payroll,
                  COUNT(CASE WHEN salary_rate IS NULL THEN 1 END) missing_rate
           FROM faculty WHERE status='active'`),
      one('SELECT COUNT(*) responses, ROUND(AVG(overall),2) avg_rating FROM trainer_feedback'),
      one("SELECT COUNT(*) pending FROM leave_requests WHERE status='pending'"),
    ]);

    const collected = Number(fees.collected);
    const payable = Number(expected.payable);
    const monthlyPayroll = Number(payroll.monthly_payroll);
    const monthRevenue = Number(feesMonth.collected);

    return success(res, {
      data: {
        students: { total: +students.total, active: +students.active || 0, suspended: +students.suspended || 0 },
        trainers: { total: +trainers.total, active: +trainers.active || 0 },
        finance: {
          collected,
          collectedThisMonth: monthRevenue,
          payable,
          pendingFees: Math.max(payable - collected, 0),
          collectionRate: payable ? Math.round((collected / payable) * 100) : 0,
          monthlyPayroll,
          // Simplified P&L: this month's collections less monthly trainer payroll.
          estimatedMonthlyProfit: monthRevenue - monthlyPayroll,
          trainersMissingSalaryRate: +payroll.missing_rate,
        },
        feedback: { responses: +feedback.responses, avgRating: feedback.avg_rating },
        leaves: { pending: +leaves.pending },
      },
    }, 'Admin summary fetched.');
  },

  /** GET /admin/financials — cash flow + payroll + P&L by month. */
  async financials(req, res) {
    const [monthly, byMode, pending, payroll] = await Promise.all([
      query(`SELECT DATE_FORMAT(paid_at,'%Y-%m') month, COALESCE(SUM(amount),0) revenue
             FROM fee_transactions GROUP BY month ORDER BY month DESC LIMIT 12`),
      query('SELECT mode, COALESCE(SUM(amount),0) amount FROM fee_transactions GROUP BY mode'),
      query(`SELECT s.id, s.name, s.email, (fs.total_amount - fs.discount) payable,
                    COALESCE((SELECT SUM(t.amount) FROM fee_transactions t WHERE t.student_id=s.id),0) paid,
                    ((fs.total_amount - fs.discount) - COALESCE((SELECT SUM(t.amount) FROM fee_transactions t WHERE t.student_id=s.id),0)) due
             FROM students s JOIN fee_structures fs ON fs.student_id = s.id
             WHERE s.status='active' HAVING due > 0 ORDER BY due DESC`),
      query(`SELECT id, name, email, department, salary_type, salary_rate
             FROM faculty WHERE status='active' ORDER BY name`),
    ]);

    const monthlyPayroll = payroll
      .filter((f) => f.salary_type === 'monthly')
      .reduce((sum, f) => sum + Number(f.salary_rate || 0), 0);

    return success(res, {
      data: {
        revenueByMonth: monthly,
        revenueByMode: byMode,
        pendingFees: { count: pending.length, total: pending.reduce((s, r) => s + Number(r.due), 0), students: pending },
        payroll: { monthlyTotal: monthlyPayroll, trainers: payroll },
      },
    }, 'Financials fetched.');
  },

  /** PATCH /admin/trainers/:id/salary  { salary_type, salary_rate } */
  async setSalary(req, res) {
    const { salary_type, salary_rate } = req.body || {};
    if (!['hourly', 'monthly'].includes(salary_type)) {
      return fail(res, "salary_type must be 'hourly' or 'monthly'.", 422);
    }
    if (Number.isNaN(Number(salary_rate)) || Number(salary_rate) < 0) {
      return fail(res, 'salary_rate must be a non-negative number.', 422);
    }
    const r = await query('UPDATE faculty SET salary_type = ?, salary_rate = ? WHERE id = ?',
      [salary_type, salary_rate, req.params.id]);
    if (!r.affectedRows) return fail(res, 'Trainer not found.', 404);
    return success(res, {}, 'Salary rate updated.');
  },

  // ---------------------------------------------------------------- emails
  async runFeeReminders(req, res) {
    const out = await EmailTriggerService.feeReminders({ triggeredBy: req.user.id, dryRun: req.query.dryRun === '1' });
    return success(res, { data: out }, `Fee reminders: ${out.sent} of ${out.audience}.`);
  },

  async runAttendanceWarnings(req, res) {
    const out = await EmailTriggerService.attendanceWarnings({ triggeredBy: req.user.id, dryRun: req.query.dryRun === '1' });
    return success(res, { data: out }, `Attendance warnings: ${out.sent} of ${out.audience}.`);
  },

  async runLowFeedbackAlerts(req, res) {
    const out = await EmailTriggerService.lowFeedbackAlerts({
      triggeredBy: req.user.id,
      minResponses: Number(req.query.minResponses) || 1,
      dryRun: req.query.dryRun === '1',
    });
    return success(res, { data: out }, `Low-feedback alerts: ${out.sent} of ${out.audience}.`);
  },

  async runBroadcast(req, res) {
    const { subject, message, audience } = req.body || {};
    if (!subject || !message) return fail(res, 'subject and message are required.', 422);
    const out = await EmailTriggerService.broadcast({ subject, message, audience, triggeredBy: req.user.id });
    return success(res, { data: out }, `Broadcast sent to ${out.sent} student(s).`);
  },

  async runEscalation(req, res) {
    const { facultyId, studentName, message } = req.body || {};
    if (!facultyId || !message) return fail(res, 'facultyId and message are required.', 422);
    const out = await EmailTriggerService.issueEscalation({
      facultyId, studentName: studentName || 'A student', message, triggeredBy: req.user.id,
    });
    return success(res, { data: out }, 'Escalation email dispatched.');
  },

  async runDaily(req, res) {
    const out = await EmailTriggerService.runDaily({ triggeredBy: req.user.id });
    return success(res, { data: out }, 'Daily communication run complete.');
  },

  /** GET /admin/emails/logs?template=&status= */
  async emailLogs(req, res) {
    const { template, status } = req.query;
    const where = [];
    const params = [];
    if (template) { where.push('template = ?'); params.push(template); }
    if (status) { where.push('status = ?'); params.push(status); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT id, template, recipient_type, recipient_email, subject, status, error, created_at
       FROM email_logs ${clause} ORDER BY id DESC LIMIT 100`, params
    );
    return success(res, { data: rows }, 'Email logs fetched.');
  },

  // ------------------------------------------- predictive drop-out analytics
  /** POST /admin/retention/recompute — recalculates risk for all active students. */
  async recomputeRisk(req, res) {
    const out = await RetentionService.recomputeAll();
    return success(res, { data: out }, `Evaluated ${out.evaluated} students; ${out.atRisk} at risk.`);
  },

  /** GET /admin/retention/risks — the red-highlight list for the dashboard. */
  async retentionRisks(req, res) {
    return success(res, { data: await RetentionService.listAtRisk() }, 'At-risk students fetched.');
  },

  // ---------------------------------------------------- batch shifting engine
  /** POST /admin/students/:id/transfer  { from_batch_id, to_batch_id, reason? } */
  async transferBatch(req, res) {
    const { from_batch_id, to_batch_id, reason } = req.body || {};
    if (!from_batch_id || !to_batch_id) return fail(res, 'from_batch_id and to_batch_id are required.', 422);

    try {
      const out = await transferStudent({
        studentId: req.params.id, fromBatchId: from_batch_id, toBatchId: to_batch_id,
        reason, transferredBy: req.user.id,
      });
      return success(res, { data: out },
        `Student transferred. ${out.attendanceRowsPreserved} attendance record(s) preserved.`);
    } catch (err) {
      if (err.status === 409 && err.conflict) return fail(res, err.message, 409, { conflict: err.conflict });
      throw err;
    }
  },

  /** GET /admin/students/:id/transfers */
  async transferLog(req, res) {
    return success(res, { data: await transferHistory(req.params.id) }, 'Transfer history fetched.');
  },

  // ---------------------------------------------------------------- leaves
  async listLeaves(req, res) {
    const rows = await query(
      `SELECT lr.*, f.name AS trainer_name, f.email AS trainer_email, u.name AS decided_by_name
       FROM leave_requests lr
       JOIN faculty f ON f.id = lr.faculty_id
       LEFT JOIN users u ON u.id = lr.decided_by
       ORDER BY FIELD(lr.status,'pending','approved','rejected'), lr.from_date DESC`
    );
    return success(res, { data: rows }, 'Leave requests fetched.');
  },

  /** PATCH /admin/leaves/:id  { status: approved|rejected, remarks? } */
  async decideLeave(req, res) {
    const { status, remarks } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, "status must be 'approved' or 'rejected'.", 422);
    }
    const rows = await query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 'Leave request not found.', 404);
    if (rows[0].status !== 'pending') return fail(res, 'This request has already been decided.', 409);

    await query(
      'UPDATE leave_requests SET status = ?, remarks = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
      [status, remarks || null, req.user.id, req.params.id]
    );
    return success(res, {}, `Leave request ${status}.`);
  },

  /** GET /admin/pacing — syllabus progress vs the calendar, every active batch. */
  async pacing(req, res) {
    return success(res, { data: await PacingService.overview() }, 'Pacing fetched.');
  },

  /** GET /admin/pacing/:batchId — topic-by-topic for one batch. */
  async pacingForBatch(req, res) {
    return success(res, { data: await PacingService.forBatch(req.params.batchId) }, 'Batch pacing fetched.');
  },

  /** POST /admin/jobs/run-daily — force tonight's pass now (it also runs itself). */
  async runDailyJobs(req, res) {
    const results = await scheduler.runDailyJobs('manual');
    return success(res, { data: results }, 'Daily jobs finished.');
  },
};

module.exports = AdminController;

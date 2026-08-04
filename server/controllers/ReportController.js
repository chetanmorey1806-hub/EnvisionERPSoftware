/**
 * ReportController — /api/reports (reportApi.js).
 * Aggregates live data from other modules; export returns CSV as a blob.
 */
const { query } = require('../utils/crud');
const { success, fail } = require('../utils/response');

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

const ReportController = {
  // GET /reports/finance?range=
  async getFinancialSummary(req, res) {
    const [totals] = await query(
      'SELECT COALESCE(SUM(amount),0) AS collected, COUNT(*) AS transactions FROM fee_transactions'
    );
    const byMode = await query(
      'SELECT mode, COALESCE(SUM(amount),0) AS amount FROM fee_transactions GROUP BY mode'
    );
    const monthly = await query(
      `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, COALESCE(SUM(amount),0) AS amount
       FROM fee_transactions GROUP BY month ORDER BY month DESC LIMIT 12`
    );
    return success(
      res,
      { data: { range: req.query.range || 'all', collected: totals.collected, transactions: totals.transactions, byMode, monthly } },
      'Financial summary fetched.'
    );
  },

  // GET /reports/enrollment
  async getEnrollmentTrends(req, res) {
    const monthly = await query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS enrolled
       FROM students GROUP BY month ORDER BY month ASC LIMIT 12`
    );
    const byCourse = await query(
      `SELECT c.title AS course, COUNT(s.id) AS students
       FROM courses c LEFT JOIN students s ON s.course_id = c.id
       GROUP BY c.id ORDER BY students DESC`
    );
    const [totals] = await query('SELECT COUNT(*) AS total FROM students');
    return success(res, { data: { total: totals.total, monthly, byCourse } }, 'Enrollment trends fetched.');
  },

  // GET /reports/export/:type?format=csv
  async exportData(req, res) {
    const map = {
      students: 'SELECT id, admission_no, name, email, phone, status FROM students ORDER BY id DESC',
      courses: 'SELECT id, code, title, department, fee, status FROM courses ORDER BY id DESC',
      fees: 'SELECT id, student_id, amount, mode, receipt_no, paid_at FROM fee_transactions ORDER BY id DESC',
    };
    const sql = map[req.params.type];
    if (!sql) return fail(res, `Unknown export type. Use one of: ${Object.keys(map).join(', ')}.`, 422);

    const rows = await query(sql);
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-export.csv"`);
    return res.send(csv);
  },
};

module.exports = ReportController;

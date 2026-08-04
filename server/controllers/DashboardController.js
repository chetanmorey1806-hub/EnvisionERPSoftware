/**
 * DashboardController — /api/dashboard
 * Every number here is computed live from the database. No static values.
 */
const { query } = require('../config/db');
const { success } = require('../utils/response');

const one = async (sql, params = []) => (await query(sql, params))[0];

const DashboardController = {
  // GET /dashboard/stats
  async stats(req, res) {
    const [
      students,
      courses,
      batches,
      admissions,
      enquiries,
      fees,
      feesThisMonth,
      expected,
      attendanceToday,
      upcomingExams,
    ] = await Promise.all([
      one(`SELECT COUNT(*) AS total,
                  SUM(status = 'active')    AS active,
                  SUM(status = 'graduated') AS graduated
           FROM students`),
      one(`SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM courses`),
      one(`SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM batches`),
      one(`SELECT COUNT(*) AS total,
                  SUM(status = 'pending')  AS pending,
                  SUM(status = 'approved') AS approved
           FROM admissions`),
      one(`SELECT COUNT(*) AS total,
                  SUM(status = 'new')       AS fresh,
                  SUM(status = 'converted') AS converted
           FROM enquiries`),
      one(`SELECT COALESCE(SUM(amount),0) AS collected, COUNT(*) AS transactions FROM fee_transactions`),
      one(`SELECT COALESCE(SUM(amount),0) AS collected
           FROM fee_transactions
           WHERE YEAR(paid_at) = YEAR(CURDATE()) AND MONTH(paid_at) = MONTH(CURDATE())`),
      one(`SELECT COALESCE(SUM(total_amount - discount),0) AS payable FROM fee_structures`),
      one(`SELECT COUNT(*) AS marked, SUM(status = 'present') AS present
           FROM attendance WHERE date = CURDATE()`),
      one(`SELECT COUNT(*) AS upcoming FROM exams
           WHERE exam_date >= CURDATE() AND status = 'scheduled'`),
    ]);

    const collected = Number(fees.collected);
    const payable = Number(expected.payable);
    const marked = Number(attendanceToday.marked) || 0;
    const present = Number(attendanceToday.present) || 0;

    return success(
      res,
      {
        data: {
          students: {
            total: Number(students.total),
            active: Number(students.active) || 0,
            graduated: Number(students.graduated) || 0,
          },
          courses: { total: Number(courses.total), active: Number(courses.active) || 0 },
          batches: { total: Number(batches.total), active: Number(batches.active) || 0 },
          admissions: {
            total: Number(admissions.total),
            pending: Number(admissions.pending) || 0,
            approved: Number(admissions.approved) || 0,
          },
          enquiries: {
            total: Number(enquiries.total),
            new: Number(enquiries.fresh) || 0,
            converted: Number(enquiries.converted) || 0,
            conversionRate: Number(enquiries.total)
              ? Math.round((Number(enquiries.converted) / Number(enquiries.total)) * 100)
              : 0,
          },
          fees: {
            collected,
            collectedThisMonth: Number(feesThisMonth.collected),
            transactions: Number(fees.transactions),
            payable,
            due: Math.max(payable - collected, 0),
            collectionRate: payable ? Math.round((collected / payable) * 100) : 0,
          },
          attendanceToday: {
            marked,
            present,
            percentage: marked ? Math.round((present / marked) * 100) : 0,
          },
          exams: { upcoming: Number(upcomingExams.upcoming) },
        },
      },
      'Dashboard stats fetched.'
    );
  },

  /**
   * GET /dashboard/charts
   *
   * Series are ZERO-FILLED across the whole window before they are returned.
   * A GROUP BY only emits months that had rows, so a quiet March simply
   * vanishes — and a line chart drawn through the gap slopes straight from
   * February to April as if March never happened. Padding the empty buckets is
   * the difference between a chart and a lie.
   */
  async charts(req, res) {
    const MONTHS = 12;
    const DAYS = 14;

    const [enrollment, feesByMonth, byCourse, feeByMode, attendance, employability] = await Promise.all([
      query(
        `SELECT DATE_FORMAT(COALESCE(admission_date, created_at), '%Y-%m') AS month, COUNT(*) AS value
         FROM students
         WHERE COALESCE(admission_date, created_at) >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
         GROUP BY month`,
        [MONTHS]
      ),
      query(
        `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS value
         FROM fee_transactions
         WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
         GROUP BY month`,
        [MONTHS]
      ),
      query(
        `SELECT c.title AS label, COUNT(s.id) AS value
         FROM courses c LEFT JOIN students s ON s.course_id = c.id
         GROUP BY c.id, c.title HAVING value > 0 ORDER BY value DESC LIMIT 8`
      ),
      query(
        `SELECT mode AS label, COALESCE(SUM(amount), 0) AS value
         FROM fee_transactions GROUP BY mode ORDER BY value DESC`
      ),
      query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS day,
                COUNT(*) AS marked,
                COALESCE(SUM(status IN ('present','late')), 0) AS present
         FROM attendance
         WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY day`,
        [DAYS]
      ),
      query(
        `SELECT employability AS label, COUNT(*) AS value
         FROM students WHERE status = 'active' GROUP BY employability`
      ),
    ]);

    // ---- zero-fill helpers ---------------------------------------------------
    const pad = (n) => String(n).padStart(2, '0');

    const monthKeys = [];
    const now = new Date();
    for (let i = MONTHS - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    }
    const dayKeys = [];
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayKeys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }

    const fillMonths = (rows, key = 'month') => {
      const map = new Map(rows.map((r) => [r[key], Number(r.value)]));
      return monthKeys.map((m) => ({
        label: m,
        value: map.get(m) || 0,
      }));
    };

    const attMap = new Map(attendance.map((r) => [r.day, r]));
    const attendanceTrend = dayKeys.map((d) => {
      const r = attMap.get(d);
      const marked = Number(r?.marked || 0);
      const present = Number(r?.present || 0);
      return {
        label: d,
        value: marked ? Math.round((present / marked) * 100) : 0,
        marked,   // so the UI can grey out a day nobody marked, rather than
        present,  // drawing it as a genuine 0% attendance day
      };
    });

    return success(res, {
      data: {
        enrollment: fillMonths(enrollment),
        feesByMonth: fillMonths(feesByMonth),
        byCourse: byCourse.map((r) => ({ label: r.label, value: Number(r.value) })),
        feeByMode: feeByMode.map((r) => ({ label: r.label, value: Number(r.value) })),
        attendanceTrend,
        employability: employability.map((r) => ({ label: r.label, value: Number(r.value) })),
      },
    }, 'Dashboard charts fetched.');
  },

  // GET /dashboard/activity — latest real events across modules
  async activity(req, res) {
    const rows = await query(
      `(SELECT 'student'   AS kind, s.name AS title, 'enrolled' AS detail, s.created_at AS at FROM students s ORDER BY s.id DESC LIMIT 5)
       UNION ALL
       (SELECT 'fee', st.name, CONCAT('paid ', t.amount), t.paid_at
          FROM fee_transactions t JOIN students st ON st.id = t.student_id ORDER BY t.id DESC LIMIT 5)
       UNION ALL
       (SELECT 'enquiry', e.name, 'new enquiry', e.created_at FROM enquiries e ORDER BY e.id DESC LIMIT 5)
       ORDER BY at DESC LIMIT 10`
    );
    return success(res, { data: rows }, 'Recent activity fetched.');
  },
};

module.exports = DashboardController;

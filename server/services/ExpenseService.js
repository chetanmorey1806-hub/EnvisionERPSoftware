/**
 * ExpenseService — the cost side of the books.
 *
 * Fees answer "what came in". Without this, "did the branch make money this
 * month?" is unanswerable, which is the whole point of the finance module.
 */
const { query } = require('../config/db');
const { withTransaction } = require('../utils/transaction');

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const CATEGORIES = ['rent', 'utilities', 'salary', 'marketing', 'equipment', 'courseware', 'maintenance', 'other'];

/**
 * Gap-free voucher number. COUNT(*)+1 would be wrong twice over: two clerks
 * saving at once would read the same count, and deleting a voucher would make
 * the next one reuse a number that the UNIQUE key still remembers.
 */
async function nextVoucherNo(conn) {
  const year = new Date().getFullYear();
  const scope = `expense:${year}`;
  await conn.execute(
    'INSERT INTO id_sequences (scope, next_val) VALUES (?, 1) ON DUPLICATE KEY UPDATE scope = scope',
    [scope]
  );
  const [locked] = await conn.execute('SELECT next_val FROM id_sequences WHERE scope = ? FOR UPDATE', [scope]);
  const seq = locked[0].next_val;
  await conn.execute('UPDATE id_sequences SET next_val = next_val + 1 WHERE scope = ?', [scope]);
  return `EXP-${year}-${String(seq).padStart(5, '0')}`;
}

const ExpenseService = {
  CATEGORIES,

  async list({ from, to, category } = {}) {
    const where = [];
    const params = [];
    if (from) { where.push('e.spent_on >= ?'); params.push(from); }
    if (to) { where.push('e.spent_on <= ?'); params.push(to); }
    if (category) { where.push('e.category = ?'); params.push(category); }
    const sql = `
      SELECT e.*, f.name AS faculty_name, u.name AS created_by_name
      FROM expenses e
      LEFT JOIN faculty f ON f.id = e.faculty_id
      LEFT JOIN users u   ON u.id = e.created_by
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.spent_on DESC, e.id DESC`;
    return query(sql, params);
  },

  async create(d) {
    const amount = money(d.amount);
    if (!(amount > 0)) throw httpError('Amount must be greater than zero.', 422);
    if (!d.spent_on) throw httpError('A spend date is required.', 422);
    if (d.category && !CATEGORIES.includes(d.category)) {
      throw httpError(`Category must be one of: ${CATEGORIES.join(', ')}.`, 422);
    }
    return withTransaction(async (conn) => {
      const voucher = await nextVoucherNo(conn);
      const [r] = await conn.execute(
        `INSERT INTO expenses
           (voucher_no, category, payee, amount, spent_on, mode, reference_no, note, faculty_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          voucher, d.category || 'other', d.payee || null, amount, d.spent_on,
          d.mode || 'bank', d.reference_no || null, d.note || null, d.faculty_id || null, d.created_by || null,
        ]
      );
      const [[row]] = await conn.execute('SELECT * FROM expenses WHERE id = ?', [r.insertId]);
      return row;
    });
  },

  async remove(id) {
    const [row] = await query('SELECT id FROM expenses WHERE id = ?', [id]);
    if (!row) throw httpError('Expense not found.', 404);
    await query('DELETE FROM expenses WHERE id = ?', [id]);
    return true;
  },

  /**
   * Money in (fees + fines actually collected) vs money out (expenses), for a
   * window. Defaults to the current month.
   */
  async profitAndLoss({ from, to } = {}) {
    const now = new Date();
    const start = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = to || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [income] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS collected, COUNT(*) AS payments
       FROM fee_transactions WHERE DATE(paid_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const [spend] = await query(
      'SELECT COALESCE(SUM(amount), 0) AS spent, COUNT(*) AS vouchers FROM expenses WHERE spent_on BETWEEN ? AND ?',
      [start, end]
    );
    const byCategory = await query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE spent_on BETWEEN ? AND ?
       GROUP BY category ORDER BY total DESC`,
      [start, end]
    );
    // Revenue leakage: billed but never collected, and still overdue.
    const [leakage] = await query(
      `SELECT COALESCE(SUM(amount - paid_amount), 0) AS uncollected
       FROM fee_installments WHERE status = 'overdue'`
    );

    const collected = money(income.collected);
    const spent = money(spend.spent);
    return {
      from: start,
      to: end,
      collected,
      payments: Number(income.payments),
      spent,
      vouchers: Number(spend.vouchers),
      net: money(collected - spent),
      by_category: byCategory.map((r) => ({ ...r, total: money(r.total) })),
      revenue_leakage: money(leakage.uncollected),
    };
  },
};

module.exports = ExpenseService;

/**
 * FeeService — the money rules of the institute.
 *
 * The shape of the thing:
 *
 *   fee_plans (template, per course)
 *        │  assignPlan(student)  — freezes base/registration/tax onto the student
 *        ▼
 *   fee_structures (what this student owes)  ──┐
 *        │  generateSchedule()                 │  payable = base + registration + tax − discount
 *        ▼                                     │
 *   fee_installments (one row per due date) ───┘
 *        │  sweepOverdue()  (nightly)
 *        ▼
 *   fee_fines (late fee, topped up daily, capped)
 *
 * Invariants this file exists to protect:
 *   - Money is computed HERE, never accepted from the client. A caller may say
 *     which plan to apply; it may not say what the total is.
 *   - The schedule always sums to exactly the payable amount. Rounding the last
 *     installment is what makes that true (see splitAmount).
 *   - A payment is allocated oldest-due-first, so "which invoice did this
 *     receipt clear?" always has an answer.
 *   - The nightly sweep is idempotent: running it five times in one day must not
 *     raise five fines. It TOPS UP one fine row per installment.
 */
const { query } = require('../config/db');
const { withTransaction } = require('../utils/transaction');
const { receiptNo } = require('../helpers/generators');

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/** Round to paise. Never let a float drift into a rupee figure. */
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Dates are CALENDAR days, not instants — and toISOString() is a trap here.
 * `new Date('2026-05-01T00:00:00')` is local midnight; in IST (UTC+5:30) that
 * is 18:30 UTC the day BEFORE, so toISOString().slice(0,10) silently walks
 * every due date back by one day. All date maths below stays in UTC and is
 * formatted from UTC parts, so a due date means the same day in every zone.
 */
const pad = (n) => String(n).padStart(2, '0');

/** Local calendar today, as YYYY-MM-DD. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const parseDay = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

function addDays(dateStr, days) {
  const t = new Date(parseDay(dateStr) + days * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function daysBetween(fromStr, toStr) {
  return Math.round((parseDay(toStr) - parseDay(fromStr)) / 86400000);
}

/**
 * Split `total` into `n` installments that sum EXACTLY to total.
 * 10,000 / 3 is 3333.33 three times = 9999.99 — a rupee vanishes. The remainder
 * is pushed onto the final installment instead.
 */
function splitAmount(total, n) {
  const each = money(Math.floor((total / n) * 100) / 100);
  const parts = Array(n).fill(each);
  parts[n - 1] = money(total - each * (n - 1));
  return parts;
}

/** Gap-free per-scope counter (same FOR UPDATE pattern as student UIDs). */
async function nextInvoiceNo(conn) {
  const year = new Date().getFullYear();
  const scope = `invoice:${year}`;
  await conn.execute(
    'INSERT INTO id_sequences (scope, next_val) VALUES (?, 1) ON DUPLICATE KEY UPDATE scope = scope',
    [scope]
  );
  const [locked] = await conn.execute('SELECT next_val FROM id_sequences WHERE scope = ? FOR UPDATE', [scope]);
  const seq = locked[0].next_val;
  await conn.execute('UPDATE id_sequences SET next_val = next_val + 1 WHERE scope = ?', [scope]);
  return `INV-${year}-${String(seq).padStart(5, '0')}`;
}

/** The whole of the pricing rule, in one place. */
function priceStructure({ base_fee = 0, registration_fee = 0, tax_pct = 0, discount = 0 }) {
  const base = money(base_fee);
  const reg = money(registration_fee);
  const disc = money(discount);
  const taxable = money(Math.max(base + reg - disc, 0));
  const tax_amount = money((taxable * Number(tax_pct)) / 100);
  const payable = money(taxable + tax_amount);
  return { base_fee: base, registration_fee: reg, discount: disc, tax_pct: Number(tax_pct), tax_amount, payable };
}

const FeeService = {
  money,
  priceStructure,
  splitAmount,

  // ---- Plans (the template) ------------------------------------------------

  async listPlans() {
    return query(
      `SELECT p.*, c.title AS course_title, c.code AS course_code,
              (SELECT COUNT(*) FROM fee_structures fs WHERE fs.plan_id = p.id) AS students_on_plan
       FROM fee_plans p
       LEFT JOIN courses c ON c.id = p.course_id
       ORDER BY p.status ASC, p.id DESC`
    );
  },

  async createPlan(d) {
    const inst = Number(d.installments || 1);
    if (inst < 1 || inst > 36) throw httpError('Installments must be between 1 and 36.', 422);
    if (Number(d.base_fee || 0) < 0) throw httpError('Base fee cannot be negative.', 422);
    if (Number(d.tax_pct || 0) < 0 || Number(d.tax_pct || 0) > 100) {
      throw httpError('Tax % must be between 0 and 100.', 422);
    }
    const r = await query(
      `INSERT INTO fee_plans
         (name, course_id, base_fee, registration_fee, tax_pct, installments,
          interval_days, late_fee_per_day, late_fee_cap, grace_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.name, d.course_id || null, d.base_fee || 0, d.registration_fee || 0, d.tax_pct || 0,
        inst, d.interval_days || 30, d.late_fee_per_day || 0, d.late_fee_cap || 0, d.grace_days || 0,
      ]
    );
    return (await query('SELECT * FROM fee_plans WHERE id = ?', [r.insertId]))[0];
  },

  async updatePlan(id, d) {
    const [plan] = await query('SELECT * FROM fee_plans WHERE id = ?', [id]);
    if (!plan) throw httpError('Fee plan not found.', 404);
    const m = { ...plan, ...d };
    await query(
      `UPDATE fee_plans SET name=?, course_id=?, base_fee=?, registration_fee=?, tax_pct=?,
              installments=?, interval_days=?, late_fee_per_day=?, late_fee_cap=?, grace_days=?, status=?
       WHERE id = ?`,
      [
        m.name, m.course_id || null, m.base_fee, m.registration_fee, m.tax_pct, m.installments,
        m.interval_days, m.late_fee_per_day, m.late_fee_cap, m.grace_days, m.status, id,
      ]
    );
    return (await query('SELECT * FROM fee_plans WHERE id = ?', [id]))[0];
  },

  // ---- Assigning a plan to a student, and generating the schedule ----------

  /**
   * Give a student a fee. This is the API that did not exist: without it a
   * student could be admitted and never owe anything.
   *
   * Re-assigning is allowed ONLY while nothing has been paid — otherwise the
   * schedule a student has already been paying against would be rewritten
   * underneath them.
   */
  async assignPlan({ student_id, plan_id, discount = 0, start_date = null }) {
    return withTransaction(async (conn) => {
      const [[student]] = await conn.execute('SELECT id FROM students WHERE id = ?', [student_id]);
      if (!student) throw httpError('Student not found.', 404);

      const [[plan]] = await conn.execute('SELECT * FROM fee_plans WHERE id = ?', [plan_id]);
      if (!plan) throw httpError('Fee plan not found.', 404);
      if (plan.status !== 'active') throw httpError('That fee plan is archived.', 409);

      const [[paidRow]] = await conn.execute(
        'SELECT COALESCE(SUM(amount),0) AS paid FROM fee_transactions WHERE student_id = ?',
        [student_id]
      );
      if (Number(paidRow.paid) > 0) {
        throw httpError(
          'This student has already paid against the current schedule. Waive or adjust the existing dues instead of reassigning a plan.',
          409
        );
      }

      const priced = priceStructure({
        base_fee: plan.base_fee,
        registration_fee: plan.registration_fee,
        tax_pct: plan.tax_pct,
        discount,
      });
      if (priced.payable <= 0) throw httpError('Payable amount must be greater than zero.', 422);

      // Structure is one-per-student (UNIQUE student_id) — upsert it.
      await conn.execute(
        `INSERT INTO fee_structures
           (student_id, plan_id, base_fee, registration_fee, tax_pct, tax_amount, total_amount, discount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           plan_id=VALUES(plan_id), base_fee=VALUES(base_fee), registration_fee=VALUES(registration_fee),
           tax_pct=VALUES(tax_pct), tax_amount=VALUES(tax_amount),
           total_amount=VALUES(total_amount), discount=VALUES(discount)`,
        [
          student_id, plan.id, priced.base_fee, priced.registration_fee, priced.tax_pct,
          priced.tax_amount, money(priced.payable + priced.discount), priced.discount,
        ]
      );

      // Rebuild the schedule from scratch (safe: nothing is paid).
      await conn.execute('DELETE FROM fee_installments WHERE student_id = ?', [student_id]);

      const n = Number(plan.installments);
      const parts = splitAmount(priced.payable, n);
      const from = start_date || today();
      const rows = [];
      for (let i = 0; i < n; i += 1) {
        const invoice_no = await nextInvoiceNo(conn);
        const due = i === 0 ? from : addDays(from, i * Number(plan.interval_days));
        await conn.execute(
          `INSERT INTO fee_installments (student_id, seq, invoice_no, amount, due_date)
           VALUES (?, ?, ?, ?, ?)`,
          [student_id, i + 1, invoice_no, parts[i], due]
        );
        rows.push({ seq: i + 1, invoice_no, amount: parts[i], due_date: due });
      }
      return { structure: priced, installments: rows };
    });
  },

  // ---- Reading the ledger --------------------------------------------------

  /** total_amount here is gross (incl. tax); payable subtracts the discount. */
  async computeStructure(studentId) {
    const [structure] = await query('SELECT * FROM fee_structures WHERE student_id = ? LIMIT 1', [studentId]);
    const [paidRow] = await query(
      'SELECT COALESCE(SUM(amount), 0) AS paid FROM fee_transactions WHERE student_id = ?',
      [studentId]
    );
    const [fineRow] = await query(
      "SELECT COALESCE(SUM(amount), 0) AS fines FROM fee_fines WHERE student_id = ? AND status = 'open'",
      [studentId]
    );

    if (!structure) {
      return {
        student_id: Number(studentId), plan_id: null, total_amount: 0, discount: 0,
        payable: 0, paid: Number(paidRow.paid), due: 0, fines_due: Number(fineRow.fines),
        has_plan: false,
      };
    }
    const payable = money(Number(structure.total_amount) - Number(structure.discount || 0));
    const paid = money(paidRow.paid);
    return {
      ...structure,
      payable,
      paid,
      due: money(Math.max(payable - paid, 0)),
      fines_due: money(fineRow.fines),
      has_plan: true,
    };
  },

  async getStudentLedger(studentId) {
    const [structure, transactions, installments, fines] = await Promise.all([
      this.computeStructure(studentId),
      query('SELECT * FROM fee_transactions WHERE student_id = ? ORDER BY id DESC', [studentId]),
      query('SELECT * FROM fee_installments WHERE student_id = ? ORDER BY seq ASC', [studentId]),
      query('SELECT * FROM fee_fines WHERE student_id = ? ORDER BY id DESC', [studentId]),
    ]);
    return { structure, transactions, installments, fines };
  },

  // ---- Collecting money ----------------------------------------------------

  /**
   * Take a payment and allocate it across the schedule, oldest due first.
   * Overpayment is refused rather than silently parked as credit — a receipt
   * that does not correspond to a real due is how books stop balancing.
   */
  async collectPayment({ student_id, amount, mode = 'cash', reference_no = null, remarks = null, collected_by = null }) {
    const amt = money(amount);
    if (!(amt > 0)) throw httpError('Amount must be greater than zero.', 422);

    return withTransaction(async (conn) => {
      const [[struct]] = await conn.execute('SELECT * FROM fee_structures WHERE student_id = ? LIMIT 1', [student_id]);
      if (!struct) throw httpError('This student has no fee plan assigned yet.', 409);

      const [[paidRow]] = await conn.execute(
        'SELECT COALESCE(SUM(amount),0) AS paid FROM fee_transactions WHERE student_id = ?',
        [student_id]
      );
      const payable = money(Number(struct.total_amount) - Number(struct.discount || 0));
      const outstanding = money(payable - Number(paidRow.paid));
      if (amt > outstanding) {
        throw httpError(
          `Cannot collect ₹${amt.toLocaleString('en-IN')} — only ₹${outstanding.toLocaleString('en-IN')} is outstanding.`,
          422
        );
      }

      // Oldest unpaid installment first. FOR UPDATE so two cashiers taking money
      // at once cannot both allocate against the same slice.
      const [dues] = await conn.execute(
        `SELECT * FROM fee_installments
         WHERE student_id = ? AND status <> 'paid' AND status <> 'waived'
         ORDER BY due_date ASC, seq ASC FOR UPDATE`,
        [student_id]
      );

      let left = amt;
      let firstSettled = null;
      for (const d of dues) {
        if (left <= 0) break;
        const owed = money(Number(d.amount) - Number(d.paid_amount));
        if (owed <= 0) continue;
        const put = money(Math.min(owed, left));
        const nowPaid = money(Number(d.paid_amount) + put);
        const settled = nowPaid >= Number(d.amount);
        await conn.execute(
          `UPDATE fee_installments
           SET paid_amount = ?, status = ?, paid_on = ?
           WHERE id = ?`,
          [nowPaid, settled ? 'paid' : 'partial', settled ? today() : null, d.id]
        );
        // Clearing the due closes its late fee too — the fine is settled with it.
        if (settled) {
          await conn.execute(
            "UPDATE fee_fines SET status = 'paid' WHERE installment_id = ? AND status = 'open'",
            [d.id]
          );
        }
        if (!firstSettled) firstSettled = d.id;
        left = money(left - put);
      }

      const receipt = receiptNo();
      const [ins] = await conn.execute(
        `INSERT INTO fee_transactions
           (student_id, installment_id, amount, mode, reference_no, receipt_no, remarks, collected_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, firstSettled, amt, mode, reference_no, receipt, remarks, collected_by]
      );
      const [[tx]] = await conn.execute('SELECT * FROM fee_transactions WHERE id = ?', [ins.insertId]);
      return { transaction: tx, receipt_no: receipt };
    });
  },

  // ---- The nightly sweep ---------------------------------------------------

  /**
   * Mark what is overdue and impose the late fee.
   *
   * Idempotent by construction: one fine row per installment (UNIQUE), and each
   * run RECOMPUTES that row's amount from days-late rather than adding to it.
   * Running the sweep twice on the same day therefore changes nothing.
   */
  async sweepOverdue(asOf = today()) {
    const rows = await query(
      `SELECT i.*, p.late_fee_per_day, p.late_fee_cap, p.grace_days
       FROM fee_installments i
       JOIN fee_structures fs ON fs.student_id = i.student_id
       LEFT JOIN fee_plans p  ON p.id = fs.plan_id
       WHERE i.status IN ('pending','partial','overdue') AND i.due_date < ?`,
      [asOf]
    );

    let markedOverdue = 0;
    let finesRaised = 0;
    let fineTotal = 0;

    for (const r of rows) {
      const grace = Number(r.grace_days || 0);
      const lateDays = daysBetween(r.due_date, asOf) - grace;

      if (r.status !== 'overdue') {
        await query("UPDATE fee_installments SET status = 'overdue' WHERE id = ?", [r.id]);
        markedOverdue += 1;
      }
      if (lateDays <= 0) continue;

      const perDay = Number(r.late_fee_per_day || 0);
      if (perDay <= 0) continue;

      const cap = Number(r.late_fee_cap || 0);
      let fine = money(perDay * lateDays);
      if (cap > 0) fine = money(Math.min(fine, cap));

      await query(
        `INSERT INTO fee_fines (student_id, installment_id, amount, days_late, reason)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           amount    = IF(status = 'open', VALUES(amount), amount),
           days_late = IF(status = 'open', VALUES(days_late), days_late)`,
        [r.student_id, r.id, fine, lateDays, `Late by ${lateDays} day(s) past ${r.due_date}`]
      );
      finesRaised += 1;
      fineTotal = money(fineTotal + fine);
    }
    return { as_of: asOf, checked: rows.length, marked_overdue: markedOverdue, fines: finesRaised, fine_total: fineTotal };
  },

  async waiveFine(fineId, userId, reason) {
    if (!reason || !String(reason).trim()) throw httpError('A reason is required to waive a fine.', 422);
    const [fine] = await query('SELECT * FROM fee_fines WHERE id = ?', [fineId]);
    if (!fine) throw httpError('Fine not found.', 404);
    if (fine.status !== 'open') throw httpError(`This fine is already ${fine.status}.`, 409);
    await query(
      "UPDATE fee_fines SET status = 'waived', waived_by = ?, waived_reason = ? WHERE id = ?",
      [userId || null, String(reason).trim(), fineId]
    );
    return (await query('SELECT * FROM fee_fines WHERE id = ?', [fineId]))[0];
  },

  // ---- Views ---------------------------------------------------------------

  /** The dues desk: who owes what, worst first. */
  async pendingDues() {
    return query(
      `SELECT s.id AS student_id, s.name, s.admission_no, s.phone, s.email,
              c.title AS course_title,
              COUNT(i.id)                                   AS overdue_count,
              COALESCE(SUM(i.amount - i.paid_amount), 0)    AS overdue_amount,
              MIN(i.due_date)                               AS oldest_due,
              DATEDIFF(CURDATE(), MIN(i.due_date))          AS days_late,
              COALESCE((SELECT SUM(f.amount) FROM fee_fines f
                        WHERE f.student_id = s.id AND f.status = 'open'), 0) AS fines_due
       FROM fee_installments i
       JOIN students s ON s.id = i.student_id
       LEFT JOIN courses c ON c.id = s.course_id
       WHERE i.status = 'overdue'
       GROUP BY s.id, s.name, s.admission_no, s.phone, s.email, c.title
       ORDER BY days_late DESC, overdue_amount DESC`
    );
  },

  async listTransactions(studentId) {
    const where = studentId ? 'WHERE t.student_id = ?' : '';
    const params = studentId ? [studentId] : [];
    return query(
      `SELECT t.*, s.name AS student_name, s.admission_no, i.invoice_no
       FROM fee_transactions t
       LEFT JOIN students s ON s.id = t.student_id
       LEFT JOIN fee_installments i ON i.id = t.installment_id
       ${where}
       ORDER BY t.id DESC`,
      params
    );
  },

  async getTransaction(txId) {
    const rows = await query(
      `SELECT t.*, s.name AS student_name, s.admission_no, i.invoice_no
       FROM fee_transactions t
       LEFT JOIN students s ON s.id = t.student_id
       LEFT JOIN fee_installments i ON i.id = t.installment_id
       WHERE t.id = ? LIMIT 1`,
      [txId]
    );
    return rows[0] || null;
  },
};

module.exports = FeeService;

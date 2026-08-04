/**
 * FeeController — thin HTTP layer over FeeService (/api/fees).
 *
 * Nothing here does arithmetic. Every rupee figure comes back from FeeService,
 * so a client cannot post its own total and have it believed.
 */
const FeeService = require('../services/FeeService');
const ExpenseService = require('../services/ExpenseService');
const NotificationService = require('../services/NotificationService');
const { findById } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const FeeController = {
  // ---- Plans ---------------------------------------------------------------

  // GET /fees/plans
  async getPlans(req, res) {
    return success(res, { data: await FeeService.listPlans() }, 'Fee plans fetched.');
  },

  // POST /fees/plans
  async createPlan(req, res) {
    if (!req.body?.name) return fail(res, 'A plan name is required.', 422);
    const plan = await FeeService.createPlan(req.body);
    return created(res, { data: plan }, 'Fee plan created.');
  },

  // PUT /fees/plans/:id
  async updatePlan(req, res) {
    const plan = await FeeService.updatePlan(req.params.id, req.body || {});
    return success(res, { data: plan }, 'Fee plan updated.');
  },

  // POST /fees/plans/preview — what would this cost? (no writes)
  async previewPlan(req, res) {
    return success(res, { data: FeeService.priceStructure(req.body || {}) }, 'Priced.');
  },

  // ---- Assignment ----------------------------------------------------------

  // POST /fees/assign  { student_id, plan_id, discount, start_date }
  async assignPlan(req, res) {
    const { student_id, plan_id } = req.body || {};
    if (!student_id || !plan_id) return fail(res, 'student_id and plan_id are required.', 422);

    const result = await FeeService.assignPlan(req.body);
    const ledger = await FeeService.getStudentLedger(student_id);
    return created(res, { data: { ...result, ledger } }, 'Fee plan assigned and schedule generated.');
  },

  // ---- Ledger --------------------------------------------------------------

  // GET /fees/student/:studentId
  async getStudentStructure(req, res) {
    const student = await findById('students', req.params.studentId);
    if (!student) return fail(res, 'Student not found.', 404);
    const ledger = await FeeService.getStudentLedger(req.params.studentId);
    return success(res, { data: { student, ...ledger } }, 'Fee structure fetched.');
  },

  // GET /fees/pending — the dues desk
  async getPendingDues(req, res) {
    return success(res, { data: await FeeService.pendingDues() }, 'Pending dues fetched.');
  },

  // ---- Collection ----------------------------------------------------------

  // POST /fees/collect
  async collectPayment(req, res) {
    const student = await findById('students', req.body.student_id);
    if (!student) return fail(res, 'Student not found.', 404);

    const result = await FeeService.collectPayment({ ...req.body, collected_by: req.user?.id || null });

    NotificationService.notifyAdmins({
      type: 'fee',
      title: 'Fee payment received',
      message: `₹${result.transaction.amount} collected from ${student.name} (${result.transaction.mode}).`,
      link: '/fees',
    }).catch(() => {});

    const ledger = await FeeService.getStudentLedger(req.body.student_id);
    return created(res, { data: { ...result, ledger } }, 'Payment collected.');
  },

  // ---- Fines ---------------------------------------------------------------

  // POST /fees/sweep — run the overdue/fine pass now (also runs nightly)
  async sweep(req, res) {
    return success(res, { data: await FeeService.sweepOverdue() }, 'Overdue sweep complete.');
  },

  // PATCH /fees/fines/:id/waive  { reason }
  async waiveFine(req, res) {
    const fine = await FeeService.waiveFine(req.params.id, req.user?.id, req.body?.reason);
    return success(res, { data: fine }, 'Fine waived.');
  },

  // ---- Expenses ------------------------------------------------------------

  // GET /fees/expenses?from=&to=&category=
  async getExpenses(req, res) {
    return success(res, { data: await ExpenseService.list(req.query) }, 'Expenses fetched.');
  },

  // POST /fees/expenses
  async createExpense(req, res) {
    const row = await ExpenseService.create({ ...req.body, created_by: req.user?.id || null });
    return created(res, { data: row }, 'Expense recorded.');
  },

  // DELETE /fees/expenses/:id
  async deleteExpense(req, res) {
    await ExpenseService.remove(req.params.id);
    return success(res, {}, 'Expense deleted.');
  },

  // GET /fees/pnl?from=&to= — money in vs money out
  async getProfitAndLoss(req, res) {
    return success(res, { data: await ExpenseService.profitAndLoss(req.query) }, 'P&L fetched.');
  },

  // ---- Receipt -------------------------------------------------------------

  // GET /fees/transactions
  async getTransactions(req, res) {
    const rows = await FeeService.listTransactions(req.query.studentId);
    return success(res, { data: rows }, 'Transactions fetched.');
  },

  // GET /fees/receipt/:txId  -> downloadable text receipt (client expects a blob)
  async generateReceipt(req, res) {
    const t = await FeeService.getTransaction(req.params.txId);
    if (!t) return fail(res, 'Transaction not found.', 404);
    const body =
      `ENVISION ERP — FEE RECEIPT\n` +
      `================================\n` +
      `Receipt No : ${t.receipt_no}\n` +
      `Invoice    : ${t.invoice_no || '-'}\n` +
      `Date       : ${t.paid_at}\n` +
      `Student    : ${t.student_name || '-'} (${t.admission_no || '-'})\n` +
      `Amount     : ${t.amount}\n` +
      `Mode       : ${t.mode}\n` +
      `Reference  : ${t.reference_no || '-'}\n` +
      `Remarks    : ${t.remarks || '-'}\n` +
      `================================\n`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${t.receipt_no}.txt"`);
    return res.send(body);
  },
};

module.exports = FeeController;

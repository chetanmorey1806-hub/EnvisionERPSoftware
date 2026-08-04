const router = require('express').Router();
const C = require('../controllers/FeeController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { selfOrCan } = require('../middleware/scope');
const validate = require('../middleware/validate');
const rules = require('../validations/feeValidation');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// ---- Plans: what a course costs. `fees.structure` is deliberately a separate
// grant from `fees.manage` — a front-desk registrar may collect money all day
// without ever being able to change the price of a course or waive a fine.
router.get('/plans', can('fees.view', 'fees.manage'), h(C.getPlans));
router.post('/plans', can('fees.structure'), h(C.createPlan));
router.put('/plans/:id', can('fees.structure'), h(C.updatePlan));
router.post('/plans/preview', can('fees.structure'), h(C.previewPlan));
router.post('/assign', can('fees.structure'), h(C.assignPlan));

// ---- Money in.
router.get('/pending', can('fees.manage'), h(C.getPendingDues));
router.post('/collect', can('fees.manage'), validate(rules.collect), h(C.collectPayment));
router.get('/transactions', can('fees.manage'), h(C.getTransactions));
router.get('/receipt/:txId', can('fees.manage'), h(C.generateReceipt));

// ---- Fines. Raising one is automatic; forgiving one is privileged and audited.
router.post('/sweep', can('fees.manage'), h(C.sweep));
router.patch('/fines/:id/waive', can('fees.structure'), h(C.waiveFine));

// ---- Money out.
router.get('/expenses', can('expenses.view'), h(C.getExpenses));
router.post('/expenses', can('expenses.create'), h(C.createExpense));
router.delete('/expenses/:id', can('expenses.delete'), h(C.deleteExpense));
router.get('/pnl', can('expenses.view'), h(C.getProfitAndLoss));

// ---- A student may read their OWN ledger; everyone else needs the grant.
router.get('/student/:studentId', selfOrCan('fees.manage'), h(C.getStudentStructure));

module.exports = router;

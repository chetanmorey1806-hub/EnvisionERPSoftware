const router = require('express').Router();
const A = require('../controllers/AdminController');
const { FeedbackController } = require('../controllers/FeedbackController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// Command center
// `fees.manage` (admin + counselor/accountant) — NOT `fees.view`, which students hold
// for their own fee page. Gating on fees.view would leak institute P&L to students.
router.get('/summary', can('fees.manage'), h(A.summary));
router.get('/financials', can('fees.manage'), h(A.financials));
router.patch('/trainers/:id/salary', can('payroll.update'), h(A.setSalary));

// Anonymous feedback — trainers have no `feedback.view` grant, so they cannot read this.
router.get('/feedback/trainers', can('feedback.view'), h(FeedbackController.trainerSummary));
router.get('/feedback/trainers/:facultyId/comments', can('feedback.view'), h(FeedbackController.trainerComments));
router.get('/feedback/escalations', can('feedback.view'), h(FeedbackController.escalations));

// Conflict-checked batch shifting + predictive drop-out analytics
router.post('/students/:id/transfer', can('students.update'), h(A.transferBatch));
router.get('/students/:id/transfers', can('students.view'), h(A.transferLog));
router.post('/retention/recompute', can('students.update'), h(A.recomputeRisk));
router.get('/retention/risks', can('students.view'), h(A.retentionRisks));

// Communication triggers
router.post('/emails/fee-reminders', can('communications.send'), h(A.runFeeReminders));
router.post('/emails/attendance-warnings', can('communications.send'), h(A.runAttendanceWarnings));
router.post('/emails/low-feedback-alerts', can('communications.send'), h(A.runLowFeedbackAlerts));
router.post('/emails/broadcast', can('communications.send'), h(A.runBroadcast));
router.post('/emails/escalation', can('communications.send'), h(A.runEscalation));
router.post('/emails/run-daily', can('communications.send'), h(A.runDaily));
router.get('/emails/logs', can('communications.view'), h(A.emailLogs));

// Syllabus pacing — actual coverage vs the calendar. `syllabus.view` so an
// academic coordinator sees it without needing any money permission.
router.get('/pacing', can('syllabus.view'), h(A.pacing));
router.get('/pacing/:batchId', can('syllabus.view'), h(A.pacingForBatch));

// Force tonight's automated pass (overdue fees + fines, risk, reminders).
router.post('/jobs/run-daily', can('settings.update'), h(A.runDailyJobs));

// Leave approvals
router.get('/leaves', can('leaves.view'), h(A.listLeaves));
router.patch('/leaves/:id', can('leaves.approve'), h(A.decideLeave));

module.exports = router;

const router = require('express').Router();
const C = require('../controllers/ReportController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/finance', can('reports.view'), h(C.getFinancialSummary));
router.get('/enrollment', can('reports.view'), h(C.getEnrollmentTrends));
router.get('/export/:type', can('reports.export'), h(C.exportData));

module.exports = router;

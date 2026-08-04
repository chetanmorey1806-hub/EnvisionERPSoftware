const router = require('express').Router();
const C = require('../controllers/ResultController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { selfOrCan } = require('../middleware/scope');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/batch/:batchId/exam/:examId', can('results.manage'), h(C.getBatchResults));
router.post('/upload', can('results.create', 'results.update'), h(C.uploadMarks));

// Own report card, or the grant.
router.get('/student/:studentId', selfOrCan('results.view'), h(C.getStudentReportCard));

module.exports = router;

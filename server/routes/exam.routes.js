const router = require('express').Router();
const C = require('../controllers/ExamController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { selfOrCan } = require('../middleware/scope');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('exams.view'), h(C.getAll));
router.post('/', can('exams.create'), h(C.create));
router.put('/:id', can('exams.update'), h(C.update));
// A student may pull their own hall ticket.
router.get('/:examId/hall-ticket/:studentId', selfOrCan('exams.view'), h(C.getHallTicket));

module.exports = router;

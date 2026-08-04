const router = require('express').Router();
const C = require('../controllers/AttendanceController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const { selfOrCan } = require('../middleware/scope');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// VIEW the register — admins, registrar and the trainer. `can_mark` in the
// payload tells the UI whether to show the mark buttons; the POST below is the
// real gate. `attendance.view` is NOT enough here (a student holds it) — the
// register lists the whole class, so it needs `attendance.manage`.
router.get('/', can('attendance.manage'), h(C.getRegister));

// MARK — route-gated to holders of `attendance.manage`, then narrowed inside
// the controller to the ONE trainer the batch is assigned to. Admins hold the
// permission but have no faculty row, so they are refused: view, not touch.
router.post('/bulk', can('attendance.manage'), h(C.submitBulk));

// The in-class check-in window. Open/close is the trainer's; ownership is
// re-checked in the controller.
router.post('/session/open', can('attendance.manage'), h(C.openSession));
router.post('/session/close', can('attendance.manage'), h(C.closeSession));

// A student may read their own report; staff need the grant.
router.get('/student/:studentId', selfOrCan('attendance.view'), h(C.getStudentReport));

module.exports = router;

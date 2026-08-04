const router = require('express').Router();
const C = require('../controllers/ClassroomController');
const S = require('../controllers/SubmissionController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('classroom.view'), h(C.list));
router.post('/', can('classroom.create'), upload.documents, h(C.create));
router.delete('/:id', can('classroom.delete', 'classroom.update'), h(C.remove));

// Submissions review / grading (trainer owns the batch; admin sees all)
router.get('/:id/submissions', can('classroom.view'), h(S.listForAssignment));
router.patch('/submissions/:submissionId', can('classroom.update'), h(S.grade));

module.exports = router;

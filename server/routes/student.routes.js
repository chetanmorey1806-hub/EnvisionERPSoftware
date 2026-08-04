const router = require('express').Router();
const C = require('../controllers/StudentController');
const L = require('../controllers/StudentLifecycleController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const validate = require('../middleware/validate');
const rules = require('../validations/studentValidation');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// --- core CRUD -------------------------------------------------------------
router.get('/', can('students.view'), h(C.getAll));

// Student Portal — must be mounted BEFORE '/:id' or 'me' matches as an id.
router.use('/me', require('./studentPortal.routes'));

router.get('/:id', can('students.view'), h(C.getById));
router.post('/', can('students.create'), validate(rules.create), h(C.create));
router.put('/:id', can('students.update'), validate(rules.update), h(C.update));
router.delete('/:id', can('students.delete'), h(C.delete));
router.post('/:id/upload-avatar', can('students.update'), upload.studentAvatar, h(C.uploadAvatar));

// --- lifecycle -------------------------------------------------------------
router.post('/:id/uid', can('students.update'), h(L.issueUid));

router.get('/:id/enrollments', can('students.view'), h(L.enrollments));
router.post('/:id/enroll', can('students.update'), h(L.enroll));
router.delete('/:id/enroll/:batchId', can('students.update'), h(L.unenroll));

router.patch('/:id/status', can('students.update'), h(L.changeStatus));
router.get('/:id/status-history', can('students.view'), h(L.statusHistory));

router.get('/:id/documents', can('students.view'), h(L.listDocuments));
router.post('/:id/documents', can('students.update'), upload.documents, h(L.uploadDocuments));

module.exports = router;

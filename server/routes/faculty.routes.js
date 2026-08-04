const router = require('express').Router();
const C = require('../controllers/FacultyController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('faculty.view'), h(C.getAll));

// Instructor Portal — must be mounted BEFORE '/:id' or 'me' matches as an id.
router.use('/me', require('./facultyPortal.routes'));

router.get('/:id', can('faculty.view'), h(C.getById));
router.post('/', can('faculty.create'), h(C.create));
router.put('/:id', can('faculty.update'), h(C.update));
router.post('/:id/schedule', can('faculty.update'), h(C.assignSchedule));
router.post('/:id/upload-avatar', can('faculty.update'), upload.facultyAvatar, h(C.uploadAvatar));

module.exports = router;

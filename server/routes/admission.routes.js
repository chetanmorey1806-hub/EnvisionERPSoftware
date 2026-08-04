const router = require('express').Router();
const C = require('../controllers/AdmissionController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('admissions.view'), h(C.getApplications));
router.get('/:id', can('admissions.view'), h(C.getDetails));
router.post('/', can('admissions.create'), h(C.submitForm));
router.patch('/:id/status', can('admissions.update'), h(C.updateStatus));
router.post('/:id/verify-docs', can('admissions.update'), h(C.verifyDocuments));

module.exports = router;

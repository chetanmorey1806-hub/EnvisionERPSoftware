const router = require('express').Router();
const C = require('../controllers/CertificateController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

// Public: anyone can verify a certificate number — that is the point of one.
router.get('/verify/:certificateNumber', h(C.verify));

// Protected below.
router.use(authenticate);
router.get('/templates', can('certificates.view'), h(C.getAllTemplates));
router.get('/', can('certificates.view'), h(C.getAll));
router.get('/eligibility/:studentId', can('certificates.view'), h(C.eligibility));

// Issuing is its own grant — NOT a generic `create`, and emphatically not
// something an authenticated student can do to themselves.
router.post('/issue', can('certificates.issue'), h(C.issue));
router.patch('/:id/revoke', can('certificates.revoke'), h(C.revoke));

module.exports = router;

const router = require('express').Router();
const C = require('../controllers/UploadController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.post('/certificate', upload.certificateFile, h(C.certificate));
router.post('/documents', upload.documents, h(C.documents));

module.exports = router;

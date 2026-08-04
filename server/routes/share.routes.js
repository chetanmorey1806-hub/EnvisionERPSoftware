const router = require('express').Router();
const C = require('../controllers/ShareController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.post('/email', can('documents.share'), h(C.email));
router.get('/contacts', can('documents.share'), h(C.contacts));

module.exports = router;

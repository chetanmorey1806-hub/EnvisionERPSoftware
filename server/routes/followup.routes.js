const router = require('express').Router();
const C = require('../controllers/FollowupController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/pending', can('followups.view'), h(C.getPendingLogs));
router.get('/enquiry/:enquiryId', can('followups.view'), h(C.getByEnquiryId));
router.post('/', can('followups.create'), h(C.create));

module.exports = router;

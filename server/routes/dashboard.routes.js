const router = require('express').Router();
const C = require('../controllers/DashboardController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate, can('dashboard.view'));
router.get('/stats', h(C.stats));
router.get('/charts', h(C.charts));
router.get('/activity', h(C.activity));

module.exports = router;

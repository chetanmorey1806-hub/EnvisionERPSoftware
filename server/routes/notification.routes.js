const router = require('express').Router();
const C = require('../controllers/NotificationController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

// Every handler is self-scoped to req.user.id inside the controller, so the
// grant is all that is needed — there is no id for a caller to tamper with.
router.use(authenticate, can('notifications.view'));
router.get('/', h(C.list));
router.get('/unread-count', h(C.unreadCount));
router.get('/presence', h(C.presence));
router.patch('/read-all', h(C.markAllRead));
router.patch('/:id/read', h(C.markRead));

module.exports = router;

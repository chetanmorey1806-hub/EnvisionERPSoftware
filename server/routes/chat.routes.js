const router = require('express').Router();
const C = require('../controllers/ChatController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

// `chat.view` is the whole gate: it decides who appears in the directory AND
// who may open a conversation. Students don't hold it, so chat is staff+trainers.
router.use(authenticate, can('chat.view'));

router.get('/directory', h(C.directory));
router.get('/rooms', h(C.rooms));
router.post('/rooms', can('chat.send'), h(C.open));
router.get('/unread', h(C.unread));

router.get('/rooms/:id/messages', h(C.history));
router.post('/rooms/:id/messages', can('chat.send'), h(C.send));
router.patch('/rooms/:id/read', h(C.markRead));
router.patch('/messages/:id', can('chat.send'), h(C.edit));

module.exports = router;

const router = require('express').Router();
const C = require('../controllers/RoomController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('classrooms.view'), h(C.list));
router.post('/', can('classrooms.create'), h(C.create));
router.put('/:id', can('classrooms.update'), h(C.update));

module.exports = router;

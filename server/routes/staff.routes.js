const router = require('express').Router();
const C = require('../controllers/StaffController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('staff.view'), h(C.getAll));
router.get('/:id', can('staff.view'), h(C.getById));
router.post('/', can('staff.create'), h(C.create));
router.put('/:id', can('staff.update'), h(C.update));
router.patch('/:id/permissions', can('staff.update'), h(C.updatePermissions));

module.exports = router;

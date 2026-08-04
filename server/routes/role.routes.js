const router = require('express').Router();
const C = require('../controllers/RoleController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('roles.view'), h(C.list));
router.get('/permissions', can('roles.view'), h(C.permissions));
router.get('/:id', can('roles.view'), h(C.getById));
router.post('/', can('roles.create'), h(C.create));
router.put('/:id', can('roles.update'), h(C.update));
router.put('/:id/permissions', can('roles.update'), h(C.setPermissions));
router.delete('/:id', can('roles.delete'), h(C.delete));

module.exports = router;

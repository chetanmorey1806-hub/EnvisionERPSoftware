const router = require('express').Router();
const C = require('../controllers/UserController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const validate = require('../middleware/validate');
const rules = require('../validations/userValidation');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// `/roles` must be declared before `/:id`, or Express reads "roles" as an id.
router.get('/roles', can('users.view'), h(C.getRoles));

router.get('/', can('users.view'), h(C.getAll));
router.post('/', can('users.create'), validate(rules.create), h(C.create));

router.get('/:id', can('users.view'), h(C.getById));
router.get('/:id/permissions', can('users.view'), h(C.permissions));
router.put('/:id', can('users.update'), validate(rules.update), h(C.update));

// Resetting a password and locking an account are update-level acts, not deletes.
router.patch('/:id/password', can('users.update'), h(C.setPassword));
router.patch('/:id/login', can('users.update'), h(C.setLoginEnabled));

router.delete('/:id', can('users.delete'), h(C.delete));

module.exports = router;

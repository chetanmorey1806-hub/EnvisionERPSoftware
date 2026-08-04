const router = require('express').Router();
const C = require('../controllers/BatchController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const validate = require('../middleware/validate');
const rules = require('../validations/batchValidation');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('batches.view'), h(C.getAll));
router.get('/:id', can('batches.view'), h(C.getById));
router.post('/', can('batches.create'), validate(rules.create), h(C.create));
router.put('/:id', can('batches.update'), h(C.update));
router.post('/:id/assign-faculty', can('batches.update'), validate(rules.assignFaculty), h(C.assignFaculty));

module.exports = router;

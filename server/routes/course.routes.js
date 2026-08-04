const router = require('express').Router();
const C = require('../controllers/CourseController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const validate = require('../middleware/validate');
const rules = require('../validations/courseValidation');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/', can('courses.view'), h(C.getAll));
router.get('/:id', can('courses.view'), h(C.getById));
router.post('/', can('courses.create'), validate(rules.create), h(C.create));
router.post('/full', can('courses.create'), h(C.createFull));
router.put('/:id', can('courses.update'), validate(rules.update), h(C.update));
router.delete('/:id', can('courses.delete'), h(C.delete));

module.exports = router;

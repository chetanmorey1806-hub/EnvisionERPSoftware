const router = require('express').Router();
const C = require('../controllers/EnquiryController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const validate = require('../middleware/validate');
const rules = require('../validations/enquiryValidation');
const h = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/stats', can('enquiries.view'), h(C.stats));
router.get('/', can('enquiries.view'), h(C.getAll));
router.get('/:id', can('enquiries.view'), h(C.getById));

router.post('/', can('enquiries.create'), validate(rules.create), h(C.create));
router.put('/:id', can('enquiries.update'), validate(rules.update), h(C.update));

router.patch('/:id/temperature', can('enquiries.update'), h(C.setTemperature));
router.patch('/:id/status', can('enquiries.update'), h(C.setStatus));
router.post('/:id/callback', can('enquiries.update'), h(C.scheduleCallback));

router.post('/:id/convert', can('enquiries.convert'), h(C.convert));

module.exports = router;

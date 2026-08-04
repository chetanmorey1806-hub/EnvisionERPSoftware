const router = require('express').Router();
const C = require('../controllers/PartnerController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/', can('partners.view'), h(C.list));
router.post('/', can('partners.create'), h(C.create));
router.get('/:id', can('partners.view'), h(C.getById));
router.put('/:id', can('partners.update'), h(C.update));
router.delete('/:id', can('partners.delete'), h(C.remove));
router.post('/:id/restore', can('partners.update'), h(C.restore));

// contacts
router.get('/:id/contacts', can('partners.view'), h(C.contacts));
router.post('/:id/contacts', can('partners.update'), h(C.addContact));
router.put('/:id/contacts/:contactId', can('partners.update'), h(C.updateContact));
router.delete('/:id/contacts/:contactId', can('partners.update'), h(C.deleteContact));

module.exports = router;

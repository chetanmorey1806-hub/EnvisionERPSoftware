const router = require('express').Router();
const C = require('../controllers/InventoryController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/items', can('inventory.view'), h(C.getItems));
router.post('/items', can('inventory.create'), h(C.createItem));
router.post('/items/:itemId/stock', can('inventory.update'), h(C.updateStock));
router.get('/suppliers', can('inventory.view'), h(C.getSuppliers));
router.post('/suppliers', can('inventory.create'), h(C.createSupplier));

module.exports = router;

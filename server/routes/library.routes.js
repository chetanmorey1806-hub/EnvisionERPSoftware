const router = require('express').Router();
const C = require('../controllers/LibraryController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/books', can('library.view'), h(C.searchBooks));      // students may browse
router.post('/books', can('library.create'), h(C.addBook));
router.post('/issue', can('library.update'), h(C.issueBook));     // issuing is a desk action
router.post('/return/:issueId', can('library.update'), h(C.returnBook));

module.exports = router;

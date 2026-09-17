/**
 * /api/classes — Google Classroom-style classes (ClassController).
 *
 * Every route needs classroom.view; whether the caller may TEACH this class
 * (post, grade, return) is decided per class inside the controller, from the
 * database, by services/ClassAccess.
 */
const router = require('express').Router();
const C = require('../controllers/ClassController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate, can('classroom.view'));

router.get('/', h(C.myClasses));
router.post('/join', h(C.join));

router.get('/:batchId', h(C.show));
router.patch('/:batchId', h(C.updateSettings));
router.post('/:batchId/code/reset', h(C.resetCode));

router.get('/:batchId/stream', h(C.stream));
router.post('/:batchId/announcements', upload.documents, h(C.announce));
router.delete('/:batchId/announcements/:id', h(C.removeAnnouncement));
router.post('/:batchId/comments', h(C.comment));
router.delete('/:batchId/comments/:id', h(C.removeComment));

router.post('/:batchId/topics', h(C.createTopic));
router.patch('/:batchId/topics/:id', h(C.renameTopic));
router.delete('/:batchId/topics/:id', h(C.removeTopic));

router.get('/:batchId/classwork', h(C.classwork));
router.post('/:batchId/classwork', upload.documents, h(C.createWork));
router.get('/:batchId/classwork/:id', h(C.workDetail));
router.patch('/:batchId/classwork/:id', h(C.updateWork));
router.delete('/:batchId/classwork/:id', h(C.removeWork));
router.post('/:batchId/classwork/:id/turn-in', upload.submission, h(C.turnIn));
router.post('/:batchId/classwork/:id/unsubmit', h(C.unsubmit));
router.put('/:batchId/classwork/:id/grades/:studentId', h(C.grade));
router.post('/:batchId/classwork/:id/return', h(C.returnWork));
router.get('/:batchId/classwork/:id/private-comments', h(C.privateComments));
router.post('/:batchId/classwork/:id/private-comments', h(C.addPrivateComment));

router.get('/:batchId/people', h(C.people));
router.delete('/:batchId/people/:studentId', h(C.removeStudent));

router.get('/:batchId/grades', h(C.grades));

module.exports = router;

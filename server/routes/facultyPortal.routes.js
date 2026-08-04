/**
 * /api/faculty/me/* — Instructor Portal.
 * Self-scoped: authorization is "you own this batch", enforced in the
 * controller against the faculty record linked to the logged-in user.
 */
const router = require('express').Router();
const C = require('../controllers/FacultyPortalController');
const T = require('../controllers/TrainerController');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.get('/', h(C.me));
router.get('/schedule', h(C.schedule));
router.get('/batches', h(C.myBatches));
router.get('/roster/:batchId', h(C.roster));

router.get('/class-logs', h(C.classLogs));
router.post('/class-log', h(C.logTopics));

router.get('/leaves', h(C.myLeaves));
router.post('/leaves', h(C.requestLeave));

// --- curriculum checklist / topic progress -----------------------------------
router.get('/syllabus/:batchId', h(T.syllabus));
router.patch('/syllabus/:batchId/:syllabusId', h(T.setTopicProgress));

// --- grading & evaluation ----------------------------------------------------
router.post('/grades', h(T.grade));
router.get('/grades/:batchId', h(T.batchGrades));

// --- flag slow learners (routes to counselor) --------------------------------
router.post('/flag-student', h(T.flagStudent));

// --- assignment lifecycle ----------------------------------------------------
router.patch('/assignments/:id/status', h(T.setAssignmentStatus));

// --- course closure & certification ------------------------------------------
router.post('/batches/:batchId/complete', h(T.completeBatch));
router.post('/students/:studentId/certify', h(T.approveCertificate));

router.get('/materials', h(C.listMaterials));
router.post('/materials', upload.documents, h(C.uploadMaterial));

module.exports = router;

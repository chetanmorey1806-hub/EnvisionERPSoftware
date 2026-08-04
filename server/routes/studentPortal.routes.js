/**
 * /api/students/me/* — Student Portal (self-scoped).
 * Ownership comes from the JWT via resolveStudent; the client never sends an id.
 */
const router = require('express').Router();
const C = require('../controllers/ClassroomController');
const S = require('../controllers/SubmissionController');
const { FeedbackController } = require('../controllers/FeedbackController');
const P = require('../controllers/PortfolioController');
const A = require('../controllers/AttendanceController');
const upload = require('../middleware/upload');
const resolveStudent = require('../middleware/resolveStudent');
const h = require('../utils/asyncHandler');

router.use(resolveStudent);
router.get('/', (req, res) => res.json({ success: true, message: 'Student profile.', data: req.student }));
router.get('/classroom', h(C.myClassroom));
router.get('/submissions', h(S.mySubmissions));
router.get('/feedback/pending', h(FeedbackController.pending));
router.post('/feedback', h(FeedbackController.submit));
router.post('/classroom/:materialId/submit', upload.submission, h(S.submit));

// --- Portfolio: the student's own proof of capability (Module B).
// Self-scoped by resolveStudent — no id in the URL to tamper with.
router.get('/portfolio', h(P.get));
router.put('/portfolio', h(P.update));
router.post('/portfolio/resume', upload.resume, h(P.uploadResume));
router.post('/portfolio/skills', h(P.addSkill));

// --- Self check-in: only works while the trainer's session is open and only
// with the code shown in class (proof the student is physically present).
router.get('/attendance', h(A.myStatus));
router.post('/attendance/checkin', h(A.checkIn));

module.exports = router;

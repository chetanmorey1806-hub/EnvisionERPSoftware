const router = require('express').Router();
const C = require('../controllers/PlacementController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// --- Corporate CRM
router.get('/jobs', can('placements.view'), h(C.getJobs));
router.post('/jobs', can('placements.create'), h(C.postJob));
router.put('/jobs/:id', can('placements.update'), h(C.updateJob));
router.get('/jobs/:id/skills', can('placements.view'), h(C.getJobSkills));

// --- Matching. Mounted BEFORE any /:id route so 'match-candidates' is never
// mistaken for an id.
router.get('/match-candidates', can('placements.match'), h(C.matchCandidates));
router.get('/pool', can('placements.view'), h(C.pool));
router.get('/skill-gaps', can('placements.view'), h(C.skillGaps));
router.get('/metrics', can('placements.view'), h(C.getStats));

// --- Pipeline
router.get('/jobs/:id/pipeline', can('placements.view'), h(C.pipeline));
router.post('/shortlist', can('placements.match'), h(C.shortlist));
router.post('/apply', can('placements.create'), h(C.applyStudent));
router.patch('/applications/:id', can('placements.update'), h(C.advance));

// --- The feedback loop
router.post('/applications/:id/interview', can('placements.interview'), h(C.logInterview));
router.get('/applications/:id/interviews', can('placements.view'), h(C.interviews));

module.exports = router;

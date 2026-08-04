/**
 * /api/trainer/* — the trainer half of the TSP loop.
 *
 * Row-level secured inside the controller: a trainer may only act on a batch
 * they teach. Supervisors (employability.override) may act anywhere.
 */
const router = require('express').Router();
const C = require('../controllers/TrainerEvalController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// Shared skill vocabulary
router.get('/skills', can('employability.view'), h(C.listSkills));
router.post('/skills', can('employability.evaluate'), h(C.createSkill));

// Technical benchmarking — the headline endpoint
router.post('/evaluate-student', can('employability.evaluate'), h(C.evaluateStudent));
router.post('/soft-skills', can('employability.evaluate'), h(C.rateSoftSkills));

// The manual sign-off, one of the three Job-Ready conditions
router.patch('/soft-skill-clearance/:studentId', can('employability.clear'), h(C.softSkillClearance));

// Readiness
router.get('/readiness/batch/:batchId', can('employability.view'), h(C.batchReadiness));
router.get('/readiness/:studentId', can('employability.view'), h(C.readiness));

// The trainer's inbox — where interview feedback lands
router.get('/remedial-tasks', can('remedials.view'), h(C.remedialTasks));
router.post('/remedial-tasks', can('remedials.create'), h(C.createRemedialTask));
router.patch('/remedial-tasks/:id', can('remedials.update'), h(C.updateRemedialTask));

// Blocking / unblocking a student — a human act, needs a reason
router.patch('/employability/:studentId', can('employability.override'), h(C.overrideEmployability));

module.exports = router;

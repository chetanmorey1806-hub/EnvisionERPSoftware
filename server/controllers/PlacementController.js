/**
 * PlacementController — /api/placements.
 *
 * The placement team as an internal recruitment agency: corporate CRM, matching
 * eligible candidates to a JD, running the interview pipeline, and — the part
 * that actually raises placement rates — feeding rejections back to trainers.
 */
const { pick, insert, findById, query } = require('../utils/crud');
const MatchingService = require('../services/MatchingService');
const Pipeline = require('../services/PlacementPipelineService');
const EmployabilityService = require('../services/EmployabilityService');
const { success, created, fail } = require('../utils/response');

const JOB_FIELDS = [
  'company', 'partner_id', 'role', 'package', 'location', 'eligibility', 'jd',
  'hr_name', 'hr_email', 'hr_phone', 'openings',
  'min_attendance_pct', 'min_score_pct', 'require_job_ready', 'closes_on', 'status',
];

const PlacementController = {
  // ---- Corporate CRM -------------------------------------------------------

  // GET /placements/jobs
  async getJobs(req, res) {
    const rows = await query(
      `SELECT j.*, p.name AS partner_name,
              (SELECT COUNT(*) FROM placement_applications a WHERE a.job_id = j.id) AS applicants,
              (SELECT COUNT(*) FROM placement_applications a
                WHERE a.job_id = j.id AND a.status = 'placed')                       AS placed,
              (SELECT GROUP_CONCAT(CONCAT(s.name, IF(js.is_mandatory, '*', ''))
                        ORDER BY js.is_mandatory DESC, s.name SEPARATOR ', ')
                 FROM job_skills js JOIN skills s ON s.id = js.skill_id
                WHERE js.job_id = j.id)                                              AS skills
       FROM placement_jobs j
       LEFT JOIN partners p ON p.id = j.partner_id
       ORDER BY j.status ASC, j.id DESC`
    );
    return success(res, { data: rows }, 'Jobs fetched.');
  },

  // POST /placements/jobs  { ..., skills: [{ skill_id, is_mandatory, min_level }] }
  async postJob(req, res) {
    const data = pick(req.body, JOB_FIELDS);
    if (!data.company || !data.role) return fail(res, 'company and role are required.', 422);

    const id = await insert('placement_jobs', data);
    for (const s of req.body.skills || []) {
      if (!s?.skill_id) continue;
      await query(
        'INSERT IGNORE INTO job_skills (job_id, skill_id, is_mandatory, min_level) VALUES (?, ?, ?, ?)',
        [id, s.skill_id, s.is_mandatory === false ? 0 : 1, s.min_level || 'beginner']
      );
    }
    return created(res, { data: await findById('placement_jobs', id) }, 'Job posted.');
  },

  // PUT /placements/jobs/:id
  async updateJob(req, res) {
    const job = await findById('placement_jobs', req.params.id);
    if (!job) return fail(res, 'Job not found.', 404);

    const data = pick(req.body, JOB_FIELDS);
    const keys = Object.keys(data);
    if (keys.length) {
      await query(
        `UPDATE placement_jobs SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => data[k]), req.params.id]
      );
    }
    if (Array.isArray(req.body.skills)) {
      await query('DELETE FROM job_skills WHERE job_id = ?', [req.params.id]);
      for (const s of req.body.skills) {
        if (!s?.skill_id) continue;
        await query(
          'INSERT IGNORE INTO job_skills (job_id, skill_id, is_mandatory, min_level) VALUES (?, ?, ?, ?)',
          [req.params.id, s.skill_id, s.is_mandatory === false ? 0 : 1, s.min_level || 'beginner']
        );
      }
    }
    return success(res, { data: await findById('placement_jobs', req.params.id) }, 'Job updated.');
  },

  // GET /placements/jobs/:id/skills
  async getJobSkills(req, res) {
    const rows = await query(
      'SELECT js.*, s.name FROM job_skills js JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ?',
      [req.params.id]
    );
    return success(res, { data: rows }, 'Job skills fetched.');
  },

  // ---- Automated matchmaking ----------------------------------------------

  /**
   * GET /placements/match-candidates?job_id=XYZ
   * The recruiter's question, answered: who is genuinely eligible, best first.
   */
  async matchCandidates(req, res) {
    const jobId = req.query.job_id || req.params.jobId;
    if (!jobId) return fail(res, 'job_id is required.', 422);
    const result = await MatchingService.matchCandidates(jobId);
    return success(res, { data: result },
      `${result.summary.eligible} eligible of ${result.summary.considered} considered.`);
  },

  // GET /placements/pool — every Job-Ready student
  async pool(req, res) {
    return success(res, { data: await EmployabilityService.pool() }, 'Placement pool fetched.');
  },

  // ---- Pipeline ------------------------------------------------------------

  // POST /placements/shortlist  { job_id, student_id, match_score, force, reason }
  async shortlist(req, res) {
    const app = await Pipeline.shortlist({ ...req.body });
    return created(res, { data: app }, 'Candidate shortlisted.');
  },

  // Kept for compatibility with the original API shape.
  async applyStudent(req, res) {
    const { job_id, student_id } = req.body || {};
    if (!job_id || !student_id) return fail(res, 'job_id and student_id are required.', 422);
    const app = await Pipeline.shortlist({ job_id, student_id, force: true, reason: 'Direct application' });
    return created(res, { data: app }, 'Application submitted.');
  },

  // GET /placements/jobs/:id/pipeline
  async pipeline(req, res) {
    return success(res, { data: await Pipeline.pipeline(req.params.id) }, 'Pipeline fetched.');
  },

  // PATCH /placements/applications/:id  { status, reason }
  async advance(req, res) {
    const { status, reason } = req.body || {};
    const app = await Pipeline.advance(req.params.id, status, { reason, userId: req.user.id });
    return success(res, { data: app }, `Application moved to ${String(status).replace(/_/g, ' ')}.`);
  },

  // ---- The feedback loop ---------------------------------------------------

  /**
   * POST /placements/applications/:id/interview
   * { round, result, feedback, interviewer, scheduled_at, deficiencies: [{skill_id, note}] }
   */
  async logInterview(req, res) {
    const out = await Pipeline.logInterview(req.params.id, { ...req.body, userId: req.user.id });
    return created(res, { data: out }, out.remedial_tasks.length
      ? `Interview logged. ${out.remedial_tasks.length} remedial task(s) sent to the trainer.`
      : 'Interview logged.');
  },

  // GET /placements/applications/:id/interviews
  async interviews(req, res) {
    return success(res, { data: await Pipeline.interviews(req.params.id) }, 'Interview log fetched.');
  },

  // GET /placements/skill-gaps — what the market keeps rejecting us for
  async skillGaps(req, res) {
    return success(res, { data: await Pipeline.skillGapReport() }, 'Skill-gap report fetched.');
  },

  // ---- Metrics -------------------------------------------------------------

  // GET /placements/metrics
  async getStats(req, res) {
    const [jobs] = await query('SELECT COUNT(*) AS c FROM placement_jobs');
    const [openJobs] = await query("SELECT COUNT(*) AS c FROM placement_jobs WHERE status = 'open'");
    const [apps] = await query('SELECT COUNT(*) AS c FROM placement_applications');
    const [placed] = await query("SELECT COUNT(*) AS c FROM placement_applications WHERE status = 'placed'");
    const [ready] = await query("SELECT COUNT(*) AS c FROM students WHERE employability = 'job_ready'");
    const [remedial] = await query("SELECT COUNT(*) AS c FROM students WHERE employability = 'remedial_required'");
    const [inPipeline] = await query(
      `SELECT COUNT(*) AS c FROM placement_applications
       WHERE status NOT IN ('placed','rejected','withdrawn')`
    );

    return success(res, {
      data: {
        totalJobs: jobs.c,
        openJobs: openJobs.c,
        applications: apps.c,
        placed: placed.c,
        jobReady: ready.c,
        remedialRequired: remedial.c,
        inPipeline: inPipeline.c,
        conversionRate: apps.c ? Math.round((placed.c / apps.c) * 100) : 0,
      },
    }, 'Placement metrics fetched.');
  },
};

module.exports = PlacementController;

/**
 * TrainerEvalController — /api/trainer/* (the trainer half of the TSP loop).
 *
 * Every route here is row-level secured: a trainer may only evaluate, clear or
 * remediate a student who is in a batch THEY teach. Authorisation is derived
 * from the JWT via assertOwnsBatch — never from an id the client supplied.
 *
 * Admins and academic coordinators bypass the ownership check (they hold
 * employability.override), because someone has to be able to act when a trainer
 * has left.
 */
const { query } = require('../config/db');
const { assertOwnsBatch } = require('./TrainerController');
const EmployabilityService = require('../services/EmployabilityService');
const NotificationService = require('../services/NotificationService');
const { success, created, fail } = require('../utils/response');

const httpError = (message, status) => Object.assign(new Error(message), { status });

const ASSESSMENT_TYPES = ['mock_test', 'code_review', 'lab_exam', 'mock_interview', 'project'];

/**
 * The gate. A trainer must own the batch; a supervisor may act anywhere.
 * Returns the faculty row to stamp on the record (null for a supervisor).
 */
async function authorise(req, batchId) {
  const isSupervisor = req.user.role === 'super_admin'
    || (req.permissions || []).includes('employability.override');

  if (batchId) {
    try {
      const { faculty } = await assertOwnsBatch(req, batchId);
      return faculty;
    } catch (err) {
      if (!isSupervisor) throw err;      // a trainer touching someone else's batch: 403
      return null;                        // a supervisor: allowed, but not "the trainer"
    }
  }
  if (!isSupervisor) throw httpError('A batch is required so ownership can be checked.', 422);
  return null;
}

const TrainerEvalController = {
  // GET /trainer/skills — the shared vocabulary
  async listSkills(req, res) {
    const rows = await query('SELECT * FROM skills ORDER BY category, name');
    return success(res, { data: rows }, 'Skills fetched.');
  },

  // POST /trainer/skills  { name, category }
  async createSkill(req, res) {
    const { name, category } = req.body || {};
    if (!name?.trim()) return fail(res, 'A skill name is required.', 422);
    const [existing] = await query('SELECT * FROM skills WHERE name = ?', [name.trim()]);
    if (existing) return success(res, { data: existing }, 'Skill already exists.');
    const r = await query('INSERT INTO skills (name, category) VALUES (?, ?)', [name.trim(), category || null]);
    const [row] = await query('SELECT * FROM skills WHERE id = ?', [r.insertId]);
    return created(res, { data: row }, 'Skill created.');
  },

  /**
   * POST /trainer/evaluate-student
   * The trainer grading a mock test / code review / lab exam / mock interview.
   *
   * Body: {
   *   student_id, batch_id, type, title, max_marks, marks_obtained,
   *   skill_id?, weight?, assessed_on?, remarks?,
   *   verify_skill?: { skill_id, level }      // "I've seen him do this"
   * }
   *
   * Recording a score immediately re-derives employability — that is the
   * bridge from classroom to placement pool.
   */
  async evaluateStudent(req, res) {
    const b = req.body || {};
    if (!b.student_id || !b.batch_id) return fail(res, 'student_id and batch_id are required.', 422);
    if (!ASSESSMENT_TYPES.includes(b.type)) {
      return fail(res, `type must be one of: ${ASSESSMENT_TYPES.join(', ')}.`, 422);
    }
    if (!b.title?.trim()) return fail(res, 'A title is required.', 422);

    const max = Number(b.max_marks ?? 100);
    const got = Number(b.marks_obtained);
    if (!(max > 0)) return fail(res, 'max_marks must be greater than zero.', 422);
    if (Number.isNaN(got) || got < 0 || got > max) {
      return fail(res, `marks_obtained must be between 0 and ${max}.`, 422);
    }

    const faculty = await authorise(req, b.batch_id);

    // The student must actually be in that batch — otherwise a trainer could
    // grade anyone by naming a batch they happen to own.
    const [enrolled] = await query(
      `SELECT s.id FROM students s
       WHERE s.id = ? AND (s.batch_id = ? OR EXISTS (
         SELECT 1 FROM student_batches sb WHERE sb.student_id = s.id AND sb.batch_id = ?))`,
      [b.student_id, b.batch_id, b.batch_id]
    );
    if (!enrolled) return fail(res, 'That student is not in this batch.', 403);

    const r = await query(
      `INSERT INTO skill_assessments
         (student_id, batch_id, faculty_id, skill_id, type, title, max_marks, marks_obtained,
          weight, assessed_on, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?)`,
      [
        b.student_id, b.batch_id, faculty?.id || null, b.skill_id || null, b.type, b.title.trim(),
        max, got, Math.max(1, Number(b.weight || 1)), b.assessed_on || null, b.remarks || null,
      ]
    );

    // A trainer vouching for a skill is what makes it visible to recruiters.
    if (b.verify_skill?.skill_id) {
      await query(
        `INSERT INTO student_skills (student_id, skill_id, level, source, verified_by, verified_at)
         VALUES (?, ?, ?, 'trainer', ?, NOW())
         ON DUPLICATE KEY UPDATE
           level = VALUES(level), source = 'trainer',
           verified_by = VALUES(verified_by), verified_at = NOW()`,
        [b.student_id, b.verify_skill.skill_id, b.verify_skill.level || 'intermediate', faculty?.id || null]
      );
    }

    // The bridge: grading re-derives readiness on the spot.
    const outcome = await EmployabilityService.recompute(b.student_id);
    const [assessment] = await query('SELECT * FROM skill_assessments WHERE id = ?', [r.insertId]);

    return created(res, {
      data: {
        assessment,
        employability: {
          status: outcome.status,
          previous: outcome.previous,
          changed: outcome.changed,
          reason: outcome.reason,
        },
        readiness: {
          attendance_pct: outcome.readiness.attendance_pct,
          technical_pct: outcome.readiness.technical_pct,
          soft_skill_cleared: outcome.readiness.soft_skill_cleared,
          checks: outcome.readiness.checks,
        },
      },
    }, outcome.changed
      ? `Evaluation saved. ${outcome.readiness.student.name} is now ${outcome.status.replace(/_/g, ' ')}.`
      : 'Evaluation saved.');
  },

  // POST /trainer/soft-skills  { student_id, batch_id, communication, punctuality, teamwork, professionalism, notes }
  async rateSoftSkills(req, res) {
    const b = req.body || {};
    const fields = ['communication', 'punctuality', 'teamwork', 'professionalism'];
    for (const f of fields) {
      const v = Number(b[f]);
      if (!Number.isInteger(v) || v < 1 || v > 5) return fail(res, `${f} must be an integer from 1 to 5.`, 422);
    }
    const faculty = await authorise(req, b.batch_id);

    await query(
      `INSERT INTO soft_skill_ratings
         (student_id, faculty_id, batch_id, communication, punctuality, teamwork, professionalism, notes, rated_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()))`,
      [
        b.student_id, faculty?.id || null, b.batch_id || null,
        b.communication, b.punctuality, b.teamwork, b.professionalism, b.notes || null, b.rated_on || null,
      ]
    );
    return created(res, { data: await EmployabilityService.readiness(b.student_id) }, 'Soft skills rated.');
  },

  /**
   * PATCH /trainer/soft-skill-clearance/:studentId  { cleared, batch_id, notes }
   * The manual sign-off — one of the three Job-Ready conditions.
   */
  async softSkillClearance(req, res) {
    const b = req.body || {};
    const faculty = await authorise(req, b.batch_id);
    const cleared = b.cleared === true || b.cleared === 1 || b.cleared === '1';

    const outcome = await EmployabilityService.setSoftSkillClearance(req.params.studentId, {
      cleared,
      faculty_id: faculty?.id || null,
      notes: b.notes,
    });

    return success(res, { data: outcome }, cleared
      ? `Soft skills cleared. Status: ${outcome.status.replace(/_/g, ' ')}.`
      : 'Soft-skill clearance withdrawn.');
  },

  // GET /trainer/readiness/:studentId — the three checks, with evidence
  async readiness(req, res) {
    const r = await EmployabilityService.readiness(req.params.studentId);
    return success(res, { data: r }, 'Readiness computed.');
  },

  // GET /trainer/readiness/batch/:batchId — the whole class at a glance
  async batchReadiness(req, res) {
    await authorise(req, req.params.batchId);
    const students = await query(
      `SELECT s.id FROM students s
       WHERE s.batch_id = ? OR EXISTS (
         SELECT 1 FROM student_batches sb WHERE sb.student_id = s.id AND sb.batch_id = ?)`,
      [req.params.batchId, req.params.batchId]
    );
    const rows = [];
    for (const s of students) {
      const r = await EmployabilityService.readiness(s.id);
      rows.push({
        student_id: s.id,
        name: r.student.name,
        admission_no: r.student.admission_no,
        employability: r.student.employability,
        attendance_pct: r.attendance_pct,
        technical_pct: r.technical_pct,
        soft_skill_cleared: r.soft_skill_cleared,
        assessments: r.assessments,
        job_ready: r.job_ready,
        failing: r.failing,
      });
    }
    return success(res, {
      data: {
        students: rows,
        summary: {
          total: rows.length,
          job_ready: rows.filter((r) => r.employability === 'job_ready').length,
          remedial: rows.filter((r) => r.employability === 'remedial_required').length,
          placed: rows.filter((r) => r.employability === 'placed').length,
        },
      },
    }, 'Batch readiness computed.');
  },

  /**
   * GET /trainer/remedial-tasks — THE TRAINER'S INBOX.
   * This is where interview feedback lands. Without this screen the loop is open.
   */
  async remedialTasks(req, res) {
    const isSupervisor = req.user.role === 'super_admin'
      || (req.permissions || []).includes('employability.override');

    let facultyId = null;
    if (!isSupervisor) {
      const [f] = await query('SELECT id FROM faculty WHERE user_id = ? LIMIT 1', [req.user.id]);
      if (!f) return fail(res, 'No trainer profile is linked to this account.', 403);
      facultyId = f.id;
    }

    const rows = await query(
      `SELECT rt.*, s.name AS student_name, s.admission_no, sk.name AS skill_name,
              b.name AS batch_name, f.name AS faculty_name
       FROM remedial_tasks rt
       JOIN students s     ON s.id = rt.student_id
       LEFT JOIN skills sk ON sk.id = rt.skill_id
       LEFT JOIN batches b ON b.id = rt.batch_id
       LEFT JOIN faculty f ON f.id = rt.faculty_id
       ${facultyId ? 'WHERE rt.faculty_id = ?' : ''}
       ORDER BY FIELD(rt.status,'open','in_progress','done','cancelled'), rt.due_date ASC, rt.id DESC`,
      facultyId ? [facultyId] : []
    );
    return success(res, {
      data: { tasks: rows, open: rows.filter((r) => r.status === 'open').length },
    }, 'Remedial tasks fetched.');
  },

  // POST /trainer/remedial-tasks  { student_id, batch_id, skill_id, title, detail, due_date }
  async createRemedialTask(req, res) {
    const b = req.body || {};
    if (!b.student_id || !b.title?.trim()) return fail(res, 'student_id and title are required.', 422);
    const faculty = await authorise(req, b.batch_id);

    const r = await query(
      `INSERT INTO remedial_tasks
         (student_id, faculty_id, batch_id, skill_id, title, detail, source, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
      [b.student_id, faculty?.id || null, b.batch_id || null, b.skill_id || null,
        b.title.trim(), b.detail || null, b.due_date || null, req.user.id]
    );
    const [row] = await query('SELECT * FROM remedial_tasks WHERE id = ?', [r.insertId]);

    const [student] = await query('SELECT user_id, name FROM students WHERE id = ?', [b.student_id]);
    if (student?.user_id) {
      NotificationService.notifyUser(student.user_id, {
        type: 'info',
        title: '📚 Extra work assigned',
        message: `${b.title.trim()}${b.due_date ? ` — due ${b.due_date}` : ''}`,
        link: '/classroom',
      }).catch(() => {});
    }
    return created(res, { data: row }, 'Remedial task assigned.');
  },

  // PATCH /trainer/remedial-tasks/:id  { status }
  async updateRemedialTask(req, res) {
    const STATUSES = ['open', 'in_progress', 'done', 'cancelled'];
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) return fail(res, `status must be one of: ${STATUSES.join(', ')}.`, 422);

    const [task] = await query('SELECT * FROM remedial_tasks WHERE id = ?', [req.params.id]);
    if (!task) return fail(res, 'Task not found.', 404);

    await query(
      "UPDATE remedial_tasks SET status = ?, completed_at = IF(? = 'done', NOW(), NULL) WHERE id = ?",
      [status, status, req.params.id]
    );

    // Closing the gap re-derives readiness — the student may be back in the pool.
    let employability = null;
    if (status === 'done') {
      const out = await EmployabilityService.recompute(task.student_id);
      employability = { status: out.status, changed: out.changed };
    }
    const [row] = await query('SELECT * FROM remedial_tasks WHERE id = ?', [req.params.id]);
    return success(res, { data: { task: row, employability } }, `Task marked ${status.replace(/_/g, ' ')}.`);
  },

  // PATCH /trainer/employability/:studentId  { status, reason }  — supervisor only
  async overrideEmployability(req, res) {
    const { status, reason } = req.body || {};
    const out = await EmployabilityService.override(req.params.studentId, status, reason, req.user.id);
    return success(res, { data: out }, `Status set to ${status.replace(/_/g, ' ')}.`);
  },
};

module.exports = TrainerEvalController;

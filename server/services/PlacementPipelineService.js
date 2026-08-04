/**
 * PlacementPipelineService — the application pipeline, and the feedback loop.
 *
 * THE LOOP (the whole point of this file):
 *
 *   A student fails a client interview. The placement officer logs the round,
 *   marks it failed, and tags WHY — not in prose, but against a skill:
 *   "SQL Queries". That single tagged skill does four things automatically:
 *
 *     1. a remedial task lands on the dashboard of the TRAINER who teaches
 *        that student's batch — not a mailing list, a named person;
 *     2. that trainer is notified;
 *     3. the student drops out of the job-ready pool (they are demonstrably
 *        not ready) and back to remedial_required;
 *     4. the deficiency is recorded against the skill, so the same gap showing
 *        up across five students becomes a curriculum problem, not five
 *        student problems.
 *
 *   Without step 1 the feedback dies in a spreadsheet, which is exactly what
 *   happens in most institutes: the trainer never learns why their students
 *   keep failing.
 *
 * THE PIPELINE
 *
 *   applied → shortlisted → internal_screening_passed → client_round_1 →
 *   client_round_2 → offered → placed
 *
 *   with `rejected` and `withdrawn` reachable from anywhere live, and `placed`
 *   terminal. Skipping a stage is refused — if a student appears in "offered"
 *   without ever having been interviewed, the pipeline is a lie.
 */
const { query } = require('../config/db');
const { withTransaction } = require('../utils/transaction');
const NotificationService = require('./NotificationService');
const EmployabilityService = require('./EmployabilityService');

function httpError(message, status, extra = {}) {
  const e = new Error(message);
  e.status = status;
  Object.assign(e, extra);
  return e;
}

/** Legal moves. Anything not listed here is refused with a 409. */
const FLOW = {
  applied: ['shortlisted', 'rejected', 'withdrawn'],
  shortlisted: ['internal_screening_passed', 'rejected', 'withdrawn'],
  internal_screening_passed: ['client_round_1', 'rejected', 'withdrawn'],
  client_round_1: ['client_round_2', 'offered', 'rejected', 'withdrawn'],
  client_round_2: ['offered', 'rejected', 'withdrawn'],
  offered: ['placed', 'rejected', 'withdrawn'],
  placed: [],
  rejected: [],
  withdrawn: ['applied'],
};

const ROUND_FOR_STAGE = {
  internal_screening_passed: 'internal_screening',
  client_round_1: 'client_round_1',
  client_round_2: 'client_round_2',
};

const PlacementPipelineService = {
  FLOW,

  assertTransition(from, to) {
    const allowed = FLOW[from] || [];
    if (!allowed.includes(to)) {
      throw httpError(
        allowed.length
          ? `An application that is '${from}' cannot become '${to}'. It can only become: ${allowed.join(', ')}.`
          : `'${from}' is final — this application cannot move again.`,
        409
      );
    }
  },

  /**
   * Shortlist a candidate against a job. Refuses anyone the matching engine
   * would not have returned — the pipeline must not become a back door around
   * the eligibility bar.
   */
  async shortlist({ job_id, student_id, match_score = null, force = false, reason = null }) {
    const [job] = await query('SELECT * FROM placement_jobs WHERE id = ?', [job_id]);
    if (!job) throw httpError('Job not found.', 404);
    if (job.status !== 'open') throw httpError('That job is closed.', 409);

    const [student] = await query('SELECT id, name, employability FROM students WHERE id = ?', [student_id]);
    if (!student) throw httpError('Student not found.', 404);

    if (Number(job.require_job_ready) === 1 && student.employability !== 'job_ready' && !force) {
      throw httpError(
        `${student.name} is not Job-Ready (currently '${student.employability.replace(/_/g, ' ')}'). ` +
        'This job requires the Job-Ready tag. Override with a reason if you mean to bypass it.',
        409
      );
    }

    const [dupe] = await query(
      'SELECT id, status FROM placement_applications WHERE job_id = ? AND student_id = ?',
      [job_id, student_id]
    );
    if (dupe) throw httpError(`${student.name} is already in this pipeline (${dupe.status}).`, 409);

    const r = await query(
      `INSERT INTO placement_applications (job_id, student_id, status, match_score, rejection_reason)
       VALUES (?, ?, 'shortlisted', ?, ?)`,
      [job_id, student_id, match_score, force && reason ? `[override] ${reason}` : null]
    );

    const [app] = await query('SELECT * FROM placement_applications WHERE id = ?', [r.insertId]);
    return app;
  },

  /** Move an application along the pipeline. */
  async advance(applicationId, to, { reason = null, userId = null } = {}) {
    const [app] = await query(
      `SELECT a.*, s.name AS student_name, s.user_id AS student_user_id, j.company, j.role, j.openings
       FROM placement_applications a
       JOIN students s ON s.id = a.student_id
       JOIN placement_jobs j ON j.id = a.job_id
       WHERE a.id = ?`,
      [applicationId]
    );
    if (!app) throw httpError('Application not found.', 404);

    this.assertTransition(app.status, to);

    if (to === 'rejected' && !String(reason || '').trim()) {
      throw httpError('A rejection needs a reason — that reason is what the trainer learns from.', 422);
    }

    await query(
      'UPDATE placement_applications SET status = ?, rejection_reason = ? WHERE id = ?',
      [to, to === 'rejected' ? String(reason).trim() : app.rejection_reason, applicationId]
    );

    // Getting placed is terminal, and it is the one thing that changes the
    // student's employability to a sticky state.
    if (to === 'placed') {
      await query(
        `UPDATE students
         SET employability = 'placed',
             employability_reason = ?, employability_updated_at = NOW()
         WHERE id = ?`,
        [`Placed at ${app.company} as ${app.role}.`, app.student_id]
      );
      NotificationService.notifyRoles(['admin', 'super_admin', 'placement'], {
        type: 'success',
        title: '🎉 Placement confirmed',
        message: `${app.student_name} placed at ${app.company} (${app.role}).`,
        link: '/placements',
      }).catch(() => {});
    }

    if (app.student_user_id && ['offered', 'placed', 'rejected'].includes(to)) {
      NotificationService.notifyUser(app.student_user_id, {
        type: to === 'rejected' ? 'warning' : 'success',
        title: to === 'rejected' ? 'Interview outcome' : `You have been ${to}!`,
        message: to === 'rejected'
          ? `${app.company}: ${String(reason).trim()}`
          : `${app.company} — ${app.role}.`,
        link: '/placements',
      }).catch(() => {});
    }

    const [updated] = await query('SELECT * FROM placement_applications WHERE id = ?', [applicationId]);
    return updated;
  },

  /**
   * ── THE FEEDBACK LOOP ──
   *
   * Log an interview round. If it failed and the officer tagged skill
   * deficiencies, route each gap back to the trainer who owns the student's
   * batch as a real, dated task — and demote the student out of the pool.
   */
  async logInterview(applicationId, {
    round, result, feedback = null, interviewer = null, scheduled_at = null,
    deficiencies = [],          // [{ skill_id, note }]
    userId = null,
  }) {
    const ROUNDS = ['internal_screening', 'client_round_1', 'client_round_2', 'technical', 'hr', 'final'];
    const RESULTS = ['pending', 'passed', 'failed', 'no_show'];
    if (!ROUNDS.includes(round)) throw httpError(`round must be one of: ${ROUNDS.join(', ')}.`, 422);
    if (!RESULTS.includes(result)) throw httpError(`result must be one of: ${RESULTS.join(', ')}.`, 422);

    const [app] = await query(
      `SELECT a.*, s.name AS student_name, s.batch_id, s.user_id AS student_user_id,
              j.company, j.role
       FROM placement_applications a
       JOIN students s ON s.id = a.student_id
       JOIN placement_jobs j ON j.id = a.job_id
       WHERE a.id = ?`,
      [applicationId]
    );
    if (!app) throw httpError('Application not found.', 404);

    if (result === 'failed' && !String(feedback || '').trim()) {
      throw httpError('A failed round needs feedback — this is what the trainer acts on.', 422);
    }

    return withTransaction(async (conn) => {
      const [ins] = await conn.execute(
        `INSERT INTO interview_logs
           (application_id, round, scheduled_at, interviewer, result, feedback, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [applicationId, round, scheduled_at || null, interviewer || null, result, feedback || null, userId]
      );
      const logId = ins.insertId;

      // Which trainer owns this student? That is who the gap belongs to.
      const [[batch]] = await conn.execute(
        `SELECT b.id, b.name, b.faculty_id, f.name AS faculty_name, f.user_id AS faculty_user_id
         FROM batches b LEFT JOIN faculty f ON f.id = b.faculty_id
         WHERE b.id = ? LIMIT 1`,
        [app.batch_id || 0]
      );

      const tasks = [];
      for (const d of deficiencies) {
        if (!d?.skill_id) continue;
        const [[skill]] = await conn.execute('SELECT id, name FROM skills WHERE id = ?', [d.skill_id]);
        if (!skill) continue;

        await conn.execute(
          'INSERT IGNORE INTO interview_deficiencies (interview_log_id, skill_id, note) VALUES (?, ?, ?)',
          [logId, skill.id, d.note || null]
        );

        const [task] = await conn.execute(
          `INSERT INTO remedial_tasks
             (student_id, faculty_id, batch_id, skill_id, title, detail, source, source_ref, due_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'interview_feedback', ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?)`,
          [
            app.student_id,
            batch?.faculty_id || null,
            app.batch_id || null,
            skill.id,
            `Remedial: ${skill.name}`,
            `${app.company} (${app.role}) rejected ${app.student_name} at ${round.replace(/_/g, ' ')}. ` +
            `Gap: ${skill.name}${d.note ? ` — ${d.note}` : ''}. Interviewer said: "${String(feedback || '').trim()}"`,
            logId,
            userId,
          ]
        );
        tasks.push({ id: task.insertId, skill: skill.name, faculty: batch?.faculty_name || null });
      }

      return { logId, tasks, app, batch, result, deficiencies };
    }).then(async ({ logId, tasks, app: a, batch, result: res }) => {
      // Notifications and the employability demotion happen AFTER the
      // transaction commits — a failed push must never roll back the record of
      // the interview itself.
      if (tasks.length && batch?.faculty_user_id) {
        NotificationService.notifyUser(batch.faculty_user_id, {
          type: 'warning',
          title: '📌 Interview feedback needs your attention',
          message: `${a.student_name} was rejected by ${a.company}. ${tasks.length} remedial task(s) assigned to you: ` +
                   `${tasks.map((t) => t.skill).join(', ')}.`,
          link: '/my-classes',
        }).catch(() => {});
      }

      if (res === 'failed') {
        // They are demonstrably not ready. Take them out of the pool — but only
        // if the engine agrees; a one-off bad day on an otherwise strong record
        // should not erase a genuine job_ready status if nothing else changed.
        if (tasks.length) {
          await query(
            `UPDATE students
             SET employability = 'remedial_required',
                 employability_reason = ?, employability_updated_at = NOW()
             WHERE id = ? AND employability = 'job_ready'`,
            [`Interview feedback: ${tasks.map((t) => t.skill).join(', ')} needs work.`, a.student_id]
          );
        }
      }

      const [log] = await query('SELECT * FROM interview_logs WHERE id = ?', [logId]);
      return { interview: log, remedial_tasks: tasks, trainer_notified: Boolean(tasks.length && batch?.faculty_user_id) };
    });
  },

  /** The whole pipeline for a job. */
  async pipeline(jobId) {
    const rows = await query(
      `SELECT a.*, s.name AS student_name, s.admission_no, s.email, s.phone, s.employability,
              (SELECT COUNT(*) FROM interview_logs il WHERE il.application_id = a.id) AS rounds
       FROM placement_applications a
       JOIN students s ON s.id = a.student_id
       WHERE a.job_id = ?
       ORDER BY FIELD(a.status,'offered','client_round_2','client_round_1',
                      'internal_screening_passed','shortlisted','applied','placed','rejected','withdrawn'),
                a.match_score DESC`,
      [jobId]
    );
    return rows;
  },

  async interviews(applicationId) {
    const logs = await query(
      `SELECT il.*, u.name AS logged_by_name
       FROM interview_logs il LEFT JOIN users u ON u.id = il.logged_by
       WHERE il.application_id = ? ORDER BY il.id DESC`,
      [applicationId]
    );
    for (const l of logs) {
      l.deficiencies = await query(
        `SELECT d.skill_id, s.name AS skill, d.note
         FROM interview_deficiencies d JOIN skills s ON s.id = d.skill_id
         WHERE d.interview_log_id = ?`,
        [l.id]
      );
    }
    return logs;
  },

  /**
   * Curriculum intelligence: the same gap across many students is a teaching
   * problem, not a student problem. This is the "market feedback" arrow.
   */
  async skillGapReport() {
    return query(
      `SELECT sk.id, sk.name AS skill,
              COUNT(DISTINCT a.student_id)  AS students_affected,
              COUNT(d.id)                   AS times_cited,
              GROUP_CONCAT(DISTINCT j.company ORDER BY j.company SEPARATOR ', ') AS cited_by
       FROM interview_deficiencies d
       JOIN skills sk           ON sk.id = d.skill_id
       JOIN interview_logs il   ON il.id = d.interview_log_id
       JOIN placement_applications a ON a.id = il.application_id
       JOIN placement_jobs j    ON j.id = a.job_id
       GROUP BY sk.id, sk.name
       ORDER BY students_affected DESC, times_cited DESC`
    );
  },
};

module.exports = PlacementPipelineService;

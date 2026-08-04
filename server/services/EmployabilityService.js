/**
 * EmployabilityService — the Job-Ready rules engine.
 *
 * The one rule that matters: **nobody is marked Job-Ready by hand.** The status
 * is DERIVED, every time, from three independent conditions:
 *
 *   1. attendance  >= 85%   (from the attendance register — the student's doing)
 *   2. technical   >= 75%   (weighted mean of benchmarked assessments — earned)
 *   3. soft skills cleared  (an explicit trainer sign-off — a human judgement)
 *
 * All three, or they are not job-ready. Two out of three is not "nearly ready",
 * it is not ready, because a recruiter's minimum bar is not a rounding target.
 *
 * Why derived and not a checkbox: a checkbox is a claim, and a claim drifts away
 * from the data behind it the moment anything changes. Recompute is idempotent
 * and cheap, so the status is always a statement about the CURRENT data. If a
 * student's attendance slips below the bar in week 9, they stop being job-ready
 * without anyone having to remember to un-tick a box.
 *
 * THE STATE MACHINE
 *
 *   unskilled ──> in_training ──> remedial_required <──> job_ready ──> placed
 *                                                                        │
 *   blocked  <── (any state, by a human, with a reason) ──> in_training  │
 *
 * `placed` and `blocked` are STICKY: the engine will not compute its way out of
 * them. A placed student who stops attending must not silently revert to
 * "in training", and a blocked student (misconduct, fee default) must not be
 * un-blocked by an algorithm — only a person can lift either.
 */
const { query } = require('../config/db');
const NotificationService = require('./NotificationService');

function httpError(message, status, extra = {}) {
  const e = new Error(message);
  e.status = status;
  Object.assign(e, extra);
  return e;
}

const MIN_ATTENDANCE = Number(process.env.JOB_READY_ATTENDANCE_PCT || 85);
const MIN_TECHNICAL = Number(process.env.JOB_READY_SCORE_PCT || 75);

/** Statuses the engine is not allowed to compute its way out of. */
const STICKY = ['placed', 'blocked'];

const EmployabilityService = {
  MIN_ATTENDANCE,
  MIN_TECHNICAL,
  STICKY,

  /**
   * The three conditions, measured. Returns the evidence, never a verdict on
   * its own — the caller decides what to do with it. Read-only.
   */
  async readiness(studentId) {
    const [student] = await query('SELECT * FROM students WHERE id = ? LIMIT 1', [studentId]);
    if (!student) throw httpError('Student not found.', 404);

    // 1. Attendance. 'late' still means they were in the room.
    const [att] = await query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status IN ('present','late')), 0) AS present
       FROM attendance WHERE student_id = ?`,
      [studentId]
    );
    const attendanceTotal = Number(att.total);
    const attendancePct = attendanceTotal
      ? Math.round((Number(att.present) / attendanceTotal) * 100)
      : 0;

    // 2. Technical — WEIGHTED by assessment weight, so a final lab exam counts
    // for more than a pop quiz. An unweighted mean lets five easy quizzes bury
    // one failed exam, which is exactly the student a recruiter sends back.
    const [tech] = await query(
      `SELECT COUNT(*) AS n,
              COALESCE(SUM(pct * weight), 0) AS weighted,
              COALESCE(SUM(weight), 0)       AS weights
       FROM skill_assessments WHERE student_id = ?`,
      [studentId]
    );
    const assessmentCount = Number(tech.n);
    const technicalPct = Number(tech.weights)
      ? Math.round(Number(tech.weighted) / Number(tech.weights))
      : 0;

    // 3. The trainer's sign-off.
    const softCleared = Number(student.soft_skill_cleared) === 1;

    const checks = [
      {
        key: 'attendance',
        label: `Attendance ≥ ${MIN_ATTENDANCE}%`,
        passed: attendanceTotal > 0 && attendancePct >= MIN_ATTENDANCE,
        value: attendancePct,
        detail: attendanceTotal === 0
          ? 'No attendance recorded yet.'
          : `${attendancePct}% of ${attendanceTotal} sessions.`,
      },
      {
        key: 'technical',
        label: `Technical score ≥ ${MIN_TECHNICAL}%`,
        // No assessments is NOT a pass. An unmeasured student is unproven, and
        // an unproven student must never be presented to a recruiter.
        passed: assessmentCount > 0 && technicalPct >= MIN_TECHNICAL,
        value: technicalPct,
        detail: assessmentCount === 0
          ? 'No technical assessment recorded yet.'
          : `${technicalPct}% weighted across ${assessmentCount} assessment(s).`,
      },
      {
        key: 'soft_skills',
        label: 'Soft skills cleared by trainer',
        passed: softCleared,
        value: softCleared ? 1 : 0,
        detail: softCleared
          ? `Signed off on ${String(student.soft_skill_cleared_at || '').slice(0, 10)}.`
          : 'Awaiting the trainer’s sign-off.',
      },
    ];

    return {
      student,
      checks,
      attendance_pct: attendancePct,
      technical_pct: technicalPct,
      soft_skill_cleared: softCleared,
      assessments: assessmentCount,
      job_ready: checks.every((c) => c.passed),
      failing: checks.filter((c) => !c.passed).map((c) => c.key),
    };
  },

  /** What the status SHOULD be, given the evidence. Pure decision, no writes. */
  decide(current, r) {
    if (STICKY.includes(current)) return { status: current, reason: null, sticky: true };

    if (r.job_ready) {
      return {
        status: 'job_ready',
        reason: `Attendance ${r.attendance_pct}%, technical ${r.technical_pct}%, soft skills cleared.`,
      };
    }
    // Measured and found short on the technical bar → they need remediation.
    // "Not yet measured" is a different thing entirely: that is just in-training.
    if (r.assessments > 0 && r.technical_pct < MIN_TECHNICAL) {
      return {
        status: 'remedial_required',
        reason: `Technical score ${r.technical_pct}% is below the ${MIN_TECHNICAL}% bar.`,
      };
    }
    if (r.assessments === 0 && r.attendance_pct === 0) {
      return { status: 'unskilled', reason: 'Nothing recorded yet.' };
    }
    const why = r.checks.filter((c) => !c.passed).map((c) => c.label.toLowerCase()).join('; ');
    return { status: 'in_training', reason: `Still short on: ${why}.` };
  },

  /**
   * Recompute and persist. Idempotent — calling it twice changes nothing the
   * second time, which is what lets the nightly job and the API both call it
   * freely.
   */
  async recompute(studentId, { notify = true } = {}) {
    const r = await this.readiness(studentId);
    const current = r.student.employability;
    const next = this.decide(current, r);

    if (next.status === current) {
      return { student_id: Number(studentId), status: current, changed: false, readiness: r };
    }

    await query(
      `UPDATE students
       SET employability = ?, employability_reason = ?, employability_updated_at = NOW()
       WHERE id = ?`,
      [next.status, next.reason, studentId]
    );

    // Becoming job-ready is the moment the placement team has been waiting for.
    if (notify && next.status === 'job_ready') {
      NotificationService.notifyRoles(['placement', 'admin', 'super_admin'], {
        type: 'success',
        title: '🎓 A student is now Job-Ready',
        message: `${r.student.name} cleared all three readiness checks and has entered the placement pool.`,
        link: '/placements',
      }).catch(() => {});
    }

    return {
      student_id: Number(studentId),
      status: next.status,
      previous: current,
      reason: next.reason,
      changed: true,
      readiness: r,
    };
  },

  /** Nightly sweep — every active student. */
  async recomputeAll() {
    const rows = await query(
      `SELECT id FROM students
       WHERE status = 'active' AND employability NOT IN ('placed','blocked')`
    );
    const out = { evaluated: rows.length, changed: 0, job_ready: 0 };
    for (const s of rows) {
      const r = await this.recompute(s.id, { notify: false });
      if (r.changed) out.changed += 1;
      if (r.status === 'job_ready') out.job_ready += 1;
    }
    return out;
  },

  /**
   * The trainer's soft-skill sign-off. This is the ONLY part of Job-Ready a
   * human sets, and clearing it immediately re-derives the status — so a
   * withdrawn sign-off drops the student out of the placement pool at once.
   */
  async setSoftSkillClearance(studentId, { cleared, faculty_id, notes }) {
    const [student] = await query('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!student) throw httpError('Student not found.', 404);

    await query(
      `UPDATE students
       SET soft_skill_cleared = ?, soft_skill_cleared_by = ?, soft_skill_cleared_at = ?
       WHERE id = ?`,
      [cleared ? 1 : 0, cleared ? faculty_id || null : null, cleared ? new Date() : null, studentId]
    );
    if (notes) {
      // Keep the trainer's words with the decision.
      await query(
        `UPDATE students SET employability_reason = CONCAT(COALESCE(employability_reason,''), ' [soft skills: ', ?, ']')
         WHERE id = ?`,
        [String(notes).slice(0, 150), studentId]
      );
    }
    return this.recompute(studentId);
  },

  /**
   * A human overriding the engine — blocking a student, or lifting a block.
   * Requires a reason: a status nobody can explain is worse than no status.
   */
  async override(studentId, status, reason, userId) {
    const allowed = ['blocked', 'in_training', 'placed'];
    if (!allowed.includes(status)) {
      throw httpError(`Only ${allowed.join(', ')} can be set by hand — the rest are derived.`, 422);
    }
    if (!reason || !String(reason).trim()) {
      throw httpError('A reason is required to override employability status.', 422);
    }
    const [student] = await query('SELECT id, name, user_id FROM students WHERE id = ?', [studentId]);
    if (!student) throw httpError('Student not found.', 404);

    await query(
      `UPDATE students
       SET employability = ?, employability_reason = ?, employability_updated_at = NOW()
       WHERE id = ?`,
      [status, `[manual] ${String(reason).trim()}`, studentId]
    );

    if (student.user_id) {
      NotificationService.notifyUser(student.user_id, {
        type: status === 'blocked' ? 'warning' : 'info',
        title: 'Your placement status changed',
        message: `Status: ${status.replace(/_/g, ' ')}. ${String(reason).trim()}`,
        link: '/placements',
      }).catch(() => {});
    }
    // Not recompute() — the whole point of an override is that it stands.
    return { student_id: Number(studentId), status, reason: String(reason).trim(), overridden: true };
  },

  /** The placement pool: everyone the team is allowed to put in front of a client. */
  async pool() {
    return query(
      `SELECT s.id, s.name, s.admission_no, s.email, s.phone, s.employability,
              s.employability_reason, s.employability_updated_at,
              c.title AS course_title, b.name AS batch_name,
              p.github_url, p.portfolio_url, p.resume_path,
              (SELECT GROUP_CONCAT(sk.name ORDER BY sk.name SEPARATOR ', ')
                 FROM student_skills ss JOIN skills sk ON sk.id = ss.skill_id
                WHERE ss.student_id = s.id AND ss.source = 'trainer') AS verified_skills
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN student_profiles p ON p.student_id = s.id
       WHERE s.employability = 'job_ready'
       ORDER BY s.employability_updated_at DESC`
    );
  },
};

module.exports = EmployabilityService;

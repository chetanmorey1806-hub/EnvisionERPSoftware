/**
 * MatchingService — the internal recruitment agency's search.
 *
 * Given a JD, who can we actually put forward?
 *
 * The distinction that makes this useful rather than a fuzzy score: a
 * candidate is either ELIGIBLE or they are not. Eligibility is a hard filter —
 * mandatory skills, the attendance bar, the score bar, the Job-Ready tag. You
 * cannot make up for a missing mandatory skill by being excellent elsewhere,
 * because the recruiter said "must know React" and they meant it.
 *
 * The SCORE only ranks the people who already passed the filter. Sending an
 * ineligible-but-high-scoring candidate to a client is how an institute loses
 * the account, so the two concepts are kept strictly apart:
 *
 *   eligible = every hard requirement met        → may be shortlisted
 *   score    = how well they fit, 0-100          → what order to call them in
 *
 * Near-misses are returned too, but flagged and never auto-shortlisted, because
 * "he's one skill short but he's very good" is a conversation for a human.
 */
const { query } = require('../config/db');

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

const MatchingService = {
  /**
   * @param {number} jobId
   * @param {object} opts  { includeNearMisses = true }
   */
  async matchCandidates(jobId, { includeNearMisses = true } = {}) {
    const [job] = await query('SELECT * FROM placement_jobs WHERE id = ? LIMIT 1', [jobId]);
    if (!job) throw httpError('Job not found.', 404);

    const jobSkills = await query(
      `SELECT js.skill_id, js.is_mandatory, js.min_level, s.name
       FROM job_skills js JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?`,
      [jobId]
    );
    const mandatory = jobSkills.filter((s) => s.is_mandatory);
    const optional = jobSkills.filter((s) => !s.is_mandatory);

    // The candidate universe: active students, not already placed or blocked,
    // and not already in the pipeline for THIS job.
    const students = await query(
      `SELECT s.id, s.name, s.admission_no, s.email, s.phone, s.employability,
              c.title AS course_title, b.name AS batch_name,
              p.github_url, p.portfolio_url, p.resume_path,
              (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id)                       AS att_total,
              (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id
                 AND a.status IN ('present','late'))                                              AS att_present,
              (SELECT COALESCE(SUM(sa.pct * sa.weight), 0) FROM skill_assessments sa
                WHERE sa.student_id = s.id)                                                       AS sa_weighted,
              (SELECT COALESCE(SUM(sa.weight), 0) FROM skill_assessments sa
                WHERE sa.student_id = s.id)                                                       AS sa_weights,
              (SELECT COALESCE(AVG(r.overall), 0) FROM soft_skill_ratings r
                WHERE r.student_id = s.id)                                                        AS soft_avg
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN student_profiles p ON p.student_id = s.id
       WHERE s.status = 'active'
         AND s.employability NOT IN ('placed','blocked')
         AND s.id NOT IN (SELECT student_id FROM placement_applications WHERE job_id = ?)
       ORDER BY s.name`,
      [jobId]
    );
    if (!students.length) return { job, requirements: { mandatory, optional }, candidates: [], near_misses: [] };

    // One query for everyone's verified skills, rather than N queries in a loop.
    const skillRows = await query(
      `SELECT ss.student_id, ss.skill_id, ss.level, ss.source, sk.name
       FROM student_skills ss JOIN skills sk ON sk.id = ss.skill_id
       WHERE ss.student_id IN (${students.map(() => '?').join(',')})`,
      students.map((s) => s.id)
    );
    const byStudent = new Map();
    for (const r of skillRows) {
      if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
      byStudent.get(r.student_id).push(r);
    }

    const eligible = [];
    const nearMisses = [];

    for (const s of students) {
      const mine = byStudent.get(s.id) || [];
      const held = new Map(mine.map((r) => [r.skill_id, r]));

      const attendancePct = Number(s.att_total)
        ? Math.round((Number(s.att_present) / Number(s.att_total)) * 100)
        : 0;
      const technicalPct = Number(s.sa_weights)
        ? Math.round(Number(s.sa_weighted) / Number(s.sa_weights))
        : 0;

      // ---- HARD FILTER. Each failure is named, so a placement officer can
      // tell a student exactly what is standing between them and the interview.
      const blockers = [];

      const missingMandatory = [];
      const underLevelled = [];
      for (const need of mandatory) {
        const has = held.get(need.skill_id);
        if (!has) { missingMandatory.push(need.name); continue; }
        if (LEVEL_RANK[has.level] < LEVEL_RANK[need.min_level]) {
          underLevelled.push(`${need.name} (${has.level} < ${need.min_level})`);
        }
      }
      if (missingMandatory.length) blockers.push(`Missing required skill: ${missingMandatory.join(', ')}`);
      if (underLevelled.length) blockers.push(`Below required level: ${underLevelled.join(', ')}`);

      if (attendancePct < Number(job.min_attendance_pct)) {
        blockers.push(`Attendance ${attendancePct}% < ${job.min_attendance_pct}% required`);
      }
      if (technicalPct < Number(job.min_score_pct)) {
        blockers.push(`Technical ${technicalPct}% < ${job.min_score_pct}% required`);
      }
      if (Number(job.require_job_ready) === 1 && s.employability !== 'job_ready') {
        blockers.push(`Not Job-Ready (currently ${String(s.employability).replace(/_/g, ' ')})`);
      }

      // ---- SCORE. Only meaningful for people who passed the filter, but we
      // compute it for near-misses too so a human can judge who is worth a call.
      const matchedOptional = optional.filter((o) => held.has(o.skill_id));
      const skillCoverage = jobSkills.length
        ? (mandatory.length - missingMandatory.length + matchedOptional.length) / jobSkills.length
        : 1;

      const score = Math.round(
        skillCoverage * 50 +                                  // does he fit the JD
        Math.min(technicalPct / 100, 1) * 25 +                // is he any good
        Math.min(attendancePct / 100, 1) * 15 +               // does he turn up
        Math.min(Number(s.soft_avg) / 5, 1) * 10              // can he hold a conversation
      );

      const row = {
        student_id: s.id,
        name: s.name,
        admission_no: s.admission_no,
        email: s.email,
        phone: s.phone,
        course_title: s.course_title,
        batch_name: s.batch_name,
        employability: s.employability,
        attendance_pct: attendancePct,
        technical_pct: technicalPct,
        soft_skill_avg: Number(Number(s.soft_avg).toFixed(2)),
        skills: mine.map((r) => ({ id: r.skill_id, name: r.name, level: r.level, source: r.source })),
        matched_skills: [...mandatory, ...optional].filter((n) => held.has(n.skill_id)).map((n) => n.name),
        missing_mandatory: missingMandatory,
        github_url: s.github_url,
        portfolio_url: s.portfolio_url,
        has_resume: Boolean(s.resume_path),
        match_score: Math.min(score, 100),
        eligible: blockers.length === 0,
        blockers,
      };

      if (row.eligible) eligible.push(row);
      else nearMisses.push(row);
    }

    eligible.sort((a, b) => b.match_score - a.match_score);
    nearMisses.sort((a, b) => b.match_score - a.match_score);

    // Show the closest 10, best first. Capping is fine; hiding the cap is not —
    // `near_misses_total` vs `near_misses_shown` keeps the two honest, so a
    // placement officer is never told "5 near misses" and handed an empty list.
    const NEAR_LIMIT = 10;
    const shown = includeNearMisses ? nearMisses.slice(0, NEAR_LIMIT) : [];

    return {
      job,
      requirements: {
        mandatory: mandatory.map((m) => ({ name: m.name, min_level: m.min_level })),
        optional: optional.map((m) => m.name),
        min_attendance_pct: Number(job.min_attendance_pct),
        min_score_pct: Number(job.min_score_pct),
        require_job_ready: Boolean(Number(job.require_job_ready)),
      },
      candidates: eligible,
      // Deliberately separate from `candidates`. These are NOT shortlistable
      // without a human explicitly deciding to relax a requirement.
      near_misses: shown,
      summary: {
        considered: students.length,
        eligible: eligible.length,
        near_misses_total: nearMisses.length,
        near_misses_shown: shown.length,
        truncated: nearMisses.length > shown.length,
      },
    };
  },
};

module.exports = MatchingService;

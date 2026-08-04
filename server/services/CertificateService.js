/**
 * CertificateService — eligibility is the whole point.
 *
 * A certificate is the institute's public claim that someone is qualified. It
 * was previously issuable by anyone logged in, against any student, with no
 * checks at all — a student could mint their own.
 *
 * Issuance now has to survive four questions, and every failed one comes back
 * to the caller by name so the front desk knows what to chase:
 *
 *   1. Has the student finished?          (batch/status completed)
 *   2. Have they actually passed?         (a final grade at or above the mark)
 *   3. Have they cleared their dues?      (nothing outstanding, no open fine)
 *   4. Were they actually there?          (attendance at or above the threshold)
 *
 * A privileged caller may override with a written reason — recorded on the
 * certificate, because an unexplained exception is indistinguishable from a
 * mistake six months later.
 */
const { query } = require('../config/db');
const FeeService = require('./FeeService');
const { certificateNumber } = require('../helpers/generators');

function httpError(message, status, extra = {}) {
  const e = new Error(message);
  e.status = status;
  Object.assign(e, extra);
  return e;
}

const PASS_PCT = Number(process.env.CERT_PASS_PCT || 40);
const ATTENDANCE_PCT = Number(process.env.CERT_ATTENDANCE_PCT || 75);

const CertificateService = {
  /**
   * Returns { eligible, checks[] } — never throws. The UI shows this as a
   * checklist before anyone clicks Issue.
   */
  async checkEligibility(studentId) {
    const [student] = await query('SELECT * FROM students WHERE id = ? LIMIT 1', [studentId]);
    if (!student) throw httpError('Student not found.', 404);

    const checks = [];

    // 1. Course completed.
    const completedStates = ['completed', 'graduated'];
    checks.push({
      key: 'course_complete',
      label: 'Course completed',
      passed: completedStates.includes(student.status),
      detail: `Student status is '${student.status}'.`,
    });

    // 2. Passed the final assessment. `is_final` marks the one that counts.
    const grades = await query(
      `SELECT marks_obtained, max_marks FROM student_grades
       WHERE student_id = ? AND is_final = 1`,
      [studentId]
    );
    const totalMax = grades.reduce((s, g) => s + Number(g.max_marks), 0);
    const totalGot = grades.reduce((s, g) => s + Number(g.marks_obtained), 0);
    const pct = totalMax > 0 ? Math.round((totalGot / totalMax) * 100) : 0;
    checks.push({
      key: 'grades',
      label: `Passed final assessment (≥ ${PASS_PCT}%)`,
      passed: grades.length > 0 && pct >= PASS_PCT,
      detail: grades.length === 0
        ? 'No final grade has been recorded.'
        : `Scored ${pct}% (${totalGot}/${totalMax}).`,
    });

    // 3. Fees cleared — dues AND any open fine.
    const fee = await FeeService.computeStructure(studentId);
    const owes = Number(fee.due) + Number(fee.fines_due || 0);
    checks.push({
      key: 'fees',
      label: 'Fees cleared',
      passed: owes <= 0,
      detail: owes > 0
        ? `₹${owes.toLocaleString('en-IN')} outstanding (${fee.due} dues + ${fee.fines_due || 0} fines).`
        : 'Nothing outstanding.',
    });

    // 4. Attendance.
    const [att] = await query(
      `SELECT COUNT(*) AS total,
              SUM(status IN ('present','late')) AS present
       FROM attendance WHERE student_id = ?`,
      [studentId]
    );
    const attPct = Number(att.total) > 0 ? Math.round((Number(att.present) / Number(att.total)) * 100) : 0;
    checks.push({
      key: 'attendance',
      label: `Attendance ≥ ${ATTENDANCE_PCT}%`,
      // No attendance recorded at all is not a pass — it is an unknown, and an
      // unknown must not silently satisfy a requirement.
      passed: Number(att.total) > 0 && attPct >= ATTENDANCE_PCT,
      detail: Number(att.total) === 0
        ? 'No attendance has been recorded.'
        : `${attPct}% (${att.present}/${att.total} sessions).`,
    });

    return { student, eligible: checks.every((c) => c.passed), checks };
  },

  /**
   * Issue. Idempotent: a student who already holds a live certificate gets the
   * existing one back rather than a second number.
   */
  async issue({ student_id, template_id = null, remarks = null, override_reason = null, issued_by = null }) {
    const [existing] = await query(
      "SELECT * FROM certificates_issued WHERE student_id = ? AND status = 'issued' LIMIT 1",
      [student_id]
    );
    if (existing) return { certificate: existing, already: true };

    const { eligible, checks } = await this.checkEligibility(student_id);
    const failed = checks.filter((c) => !c.passed);

    if (!eligible && !override_reason) {
      throw httpError(
        `This student is not eligible yet: ${failed.map((f) => f.label.toLowerCase()).join('; ')}.`,
        409,
        { checks }
      );
    }

    const note = !eligible
      ? `[OVERRIDE] ${override_reason} — failed: ${failed.map((f) => f.key).join(', ')}${remarks ? `. ${remarks}` : ''}`
      : remarks;

    const r = await query(
      `INSERT INTO certificates_issued
         (certificate_number, student_id, template_id, approved_by, issued_date, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [certificateNumber(), student_id, template_id, issued_by, new Date().toISOString().slice(0, 10), note]
    );
    const [cert] = await query('SELECT * FROM certificates_issued WHERE id = ?', [r.insertId]);
    return { certificate: cert, already: false, overridden: !eligible };
  },

  /** Revoking was unreachable before — the enum value existed with no endpoint. */
  async revoke(id, reason) {
    if (!reason || !String(reason).trim()) throw httpError('A reason is required to revoke a certificate.', 422);
    const [cert] = await query('SELECT * FROM certificates_issued WHERE id = ?', [id]);
    if (!cert) throw httpError('Certificate not found.', 404);
    if (cert.status === 'revoked') throw httpError('That certificate is already revoked.', 409);

    await query(
      "UPDATE certificates_issued SET status = 'revoked', remarks = CONCAT(COALESCE(remarks,''), ' [REVOKED] ', ?) WHERE id = ?",
      [String(reason).trim(), id]
    );
    return (await query('SELECT * FROM certificates_issued WHERE id = ?', [id]))[0];
  },

  async list() {
    return query(
      `SELECT ci.*, s.name AS student_name, s.admission_no, t.name AS template_name,
              u.name AS approved_by_name
       FROM certificates_issued ci
       LEFT JOIN students s ON s.id = ci.student_id
       LEFT JOIN certificate_templates t ON t.id = ci.template_id
       LEFT JOIN users u ON u.id = ci.approved_by
       ORDER BY ci.id DESC`
    );
  },
};

module.exports = CertificateService;

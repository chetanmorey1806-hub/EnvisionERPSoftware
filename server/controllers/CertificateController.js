/**
 * CertificateController — /api/certificates (certificateApi.js).
 *
 * All the judgement lives in CertificateService; this is HTTP plumbing.
 */
const CertificateService = require('../services/CertificateService');
const NotificationService = require('../services/NotificationService');
const { findAll, query } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const CertificateController = {
  // GET /certificates/templates
  async getAllTemplates(req, res) {
    return success(res, { data: await findAll('certificate_templates', { orderBy: 'id ASC' }) }, 'Templates fetched.');
  },

  // GET /certificates
  async getAll(req, res) {
    return success(res, { data: await CertificateService.list() }, 'Certificates fetched.');
  },

  // GET /certificates/eligibility/:studentId — the checklist, before issuing.
  async eligibility(req, res) {
    const result = await CertificateService.checkEligibility(req.params.studentId);
    return success(res, { data: result }, 'Eligibility checked.');
  },

  // POST /certificates/issue  { student_id, template_id, remarks, override_reason }
  async issue(req, res) {
    const { student_id } = req.body || {};
    if (!student_id) return fail(res, 'student_id is required.', 422);

    const result = await CertificateService.issue({ ...req.body, issued_by: req.user?.id || null });

    if (!result.already) {
      NotificationService.notifyAdmins({
        type: 'certificate',
        title: result.overridden ? 'Certificate issued by override' : 'Certificate issued',
        message: `${result.certificate.certificate_number} issued to student #${student_id}.`,
        link: '/certificates',
      }).catch(() => {});
    }

    return created(
      res,
      { data: result.certificate },
      result.already ? 'This student already holds a certificate.' : 'Certificate issued.'
    );
  },

  // PATCH /certificates/:id/revoke  { reason }
  async revoke(req, res) {
    const cert = await CertificateService.revoke(req.params.id, req.body?.reason);
    return success(res, { data: cert }, 'Certificate revoked.');
  },

  // GET /certificates/verify/:certificateNumber  (public verification)
  async verify(req, res) {
    const rows = await query(
      `SELECT ci.certificate_number, ci.issued_date, ci.status,
              s.name AS student_name, s.admission_no,
              t.name AS template_name
       FROM certificates_issued ci
       LEFT JOIN students s ON s.id = ci.student_id
       LEFT JOIN certificate_templates t ON t.id = ci.template_id
       WHERE ci.certificate_number = ? LIMIT 1`,
      [req.params.certificateNumber]
    );
    if (!rows.length) return fail(res, 'Certificate not found or invalid.', 404);
    return success(res, { data: { valid: rows[0].status === 'issued', certificate: rows[0] } }, 'Certificate verified.');
  },
};

module.exports = CertificateController;

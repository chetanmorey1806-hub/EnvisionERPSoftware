/**
 * AdmissionController — /api/admissions (admissionApi.js).
 * Flow: submit -> (verify docs) -> updateStatus(approved) can create a student.
 */
const { pick, insert, update, findById, query } = require('../utils/crud');
const { admissionNo } = require('../helpers/generators');
const { today } = require('../helpers/dateUtils');
const NotificationService = require('../services/NotificationService');
const { success, created, fail } = require('../utils/response');

const FIELDS = ['name', 'email', 'phone', 'course_id', 'batch_id', 'status', 'remarks'];
const STATUSES = ['pending', 'verified', 'approved', 'rejected'];

const AdmissionController = {
  // GET /admissions
  async getApplications(req, res) {
    const { status } = req.query;
    const where = status ? 'WHERE a.status = ?' : '';
    const params = status ? [status] : [];
    const rows = await query(
      `SELECT a.*, c.title AS course_name
       FROM admissions a
       LEFT JOIN courses c ON c.id = a.course_id
       ${where}
       ORDER BY a.id DESC`,
      params
    );
    return success(res, { data: rows }, 'Admission applications fetched.');
  },

  // GET /admissions/:id
  async getDetails(req, res) {
    const admission = await findById('admissions', req.params.id);
    if (!admission) return fail(res, 'Application not found.', 404);
    return success(res, { data: admission }, 'Application fetched.');
  },

  // POST /admissions
  async submitForm(req, res) {
    const data = pick(req.body, FIELDS);
    if (!data.name) return fail(res, 'Applicant name is required.', 422);
    const id = await insert('admissions', data);

    NotificationService.notifyAdmins({
      type: 'admission',
      title: 'New admission application',
      message: `${data.name} submitted an admission application.`,
      link: '/admissions',
    }).catch(() => {});

    return created(res, { data: await findById('admissions', id) }, 'Application submitted.');
  },

  // PATCH /admissions/:id/status  { status, remarks }
  async updateStatus(req, res) {
    const admission = await findById('admissions', req.params.id);
    if (!admission) return fail(res, 'Application not found.', 404);

    const { status, remarks } = req.body || {};
    if (!STATUSES.includes(status)) {
      return fail(res, `status must be one of: ${STATUSES.join(', ')}.`, 422);
    }

    const patch = { status };
    if (remarks !== undefined) patch.remarks = remarks;

    // On approval, promote the applicant into the students table (once).
    if (status === 'approved' && !admission.student_id) {
      const studentId = await insert('students', {
        name: admission.name,
        email: admission.email,
        phone: admission.phone,
        course_id: admission.course_id,
        batch_id: admission.batch_id,
        admission_no: admissionNo(),
        admission_date: today(),
      });
      patch.student_id = studentId;
    }

    await update('admissions', req.params.id, patch);
    return success(res, { data: await findById('admissions', req.params.id) }, 'Application status updated.');
  },

  // POST /admissions/:id/verify-docs
  async verifyDocuments(req, res) {
    const admission = await findById('admissions', req.params.id);
    if (!admission) return fail(res, 'Application not found.', 404);
    await update('admissions', req.params.id, {
      docs_verified: 1,
      status: admission.status === 'pending' ? 'verified' : admission.status,
    });
    return success(res, { data: await findById('admissions', req.params.id) }, 'Documents verified.');
  },
};

module.exports = AdmissionController;

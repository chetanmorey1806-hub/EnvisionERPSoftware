/**
 * StudentLifecycleController — registrar operations on a student record.
 * Thin HTTP layer over StudentLifecycleService; service errors carry `.status`.
 */
const Lifecycle = require('../services/StudentLifecycleService');
const { findById } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const DOC_TYPES = ['id_proof', 'photo', 'address_proof', 'marksheet', 'certificate', 'other'];

const StudentLifecycleController = {
  // POST /students/:id/uid  -> issue the institute student ID
  async issueUid(req, res) {
    const uid = await Lifecycle.assignUid(req.params.id);
    return success(res, { data: { studentId: Number(req.params.id), student_uid: uid } }, 'Student ID issued.');
  },

  // POST /students/:id/enroll  { batch_id, enrolled_on? }
  async enroll(req, res) {
    const { batch_id, enrolled_on } = req.body || {};
    if (!batch_id) return fail(res, 'batch_id is required.', 422);

    try {
      const result = await Lifecycle.enrollInBatch(req.params.id, batch_id, { enrolledOn: enrolled_on });
      return created(res, { data: result }, 'Student enrolled in batch.');
    } catch (err) {
      // Surface the conflicting batch so the UI can explain the clash.
      if (err.status === 409 && err.conflict) {
        return fail(res, err.message, 409, { conflict: err.conflict });
      }
      throw err;
    }
  },

  // DELETE /students/:id/enroll/:batchId
  async unenroll(req, res) {
    await Lifecycle.unenroll(req.params.id, req.params.batchId, req.body?.status || 'dropped');
    return success(res, {}, 'Student withdrawn from batch.');
  },

  // GET /students/:id/enrollments
  async enrollments(req, res) {
    return success(res, { data: await Lifecycle.listEnrollments(req.params.id) }, 'Enrollments fetched.');
  },

  // PATCH /students/:id/status  { status, reason? }
  async changeStatus(req, res) {
    const { status, reason } = req.body || {};
    if (!status) return fail(res, 'status is required.', 422);
    const result = await Lifecycle.changeStatus(req.params.id, status, {
      reason,
      changedBy: req.user?.id || null,
    });
    return success(res, { data: result }, `Student status changed to "${status}".`);
  },

  // GET /students/:id/status-history
  async statusHistory(req, res) {
    return success(res, { data: await Lifecycle.statusHistory(req.params.id) }, 'Status history fetched.');
  },

  // POST /students/:id/documents  (multipart: documents[]; field doc_type)
  async uploadDocuments(req, res) {
    if (!(await findById('students', req.params.id))) return fail(res, 'Student not found.', 404);
    if (!req.files?.length) return fail(res, 'No files uploaded (field "documents").', 422);

    const docType = req.body?.doc_type || 'other';
    if (!DOC_TYPES.includes(docType)) {
      return fail(res, `doc_type must be one of: ${DOC_TYPES.join(', ')}.`, 422);
    }

    const saved = [];
    for (const file of req.files) {
      saved.push(await Lifecycle.attachDocument(req.params.id, {
        docType, file, uploadedBy: req.user?.id,
      }));
    }
    return created(res, { data: saved }, `${saved.length} document(s) uploaded.`);
  },

  // GET /students/:id/documents
  async listDocuments(req, res) {
    return success(res, { data: await Lifecycle.listDocuments(req.params.id) }, 'Documents fetched.');
  },
};

module.exports = StudentLifecycleController;

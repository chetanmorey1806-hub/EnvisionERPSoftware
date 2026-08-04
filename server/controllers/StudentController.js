/**
 * StudentController — CRUD + avatar upload for /api/students, via StudentModel.
 * List supports optional ?search, ?status, ?batchId, ?courseId query filters.
 */
const Student = require('../models/StudentModel');
const { admissionNo } = require('../helpers/generators');
const { success, created, fail } = require('../utils/response');

const StudentController = {
  async getAll(req, res) {
    const rows = await Student.listWithRelations(req.query);
    return success(res, { data: rows }, 'Students fetched.');
  },

  async getById(req, res) {
    const student = await Student.findById(req.params.id);
    if (!student) return fail(res, 'Student not found.', 404);
    return success(res, { data: student }, 'Student fetched.');
  },

  async create(req, res) {
    // Auto-assign an admission number when the client didn't supply one.
    const payload = { ...req.body };
    if (!payload.admission_no) payload.admission_no = admissionNo();
    const student = await Student.create(payload);
    return created(res, { data: student }, 'Student enrolled.');
  },

  async update(req, res) {
    if (!(await Student.exists(req.params.id))) return fail(res, 'Student not found.', 404);
    return success(res, { data: await Student.update(req.params.id, req.body) }, 'Student updated.');
  },

  async delete(req, res) {
    if (!(await Student.remove(req.params.id))) return fail(res, 'Student not found.', 404);
    return success(res, {}, 'Student removed.');
  },

  // POST /students/:id/upload-avatar  (multipart, field name: "avatar")
  async uploadAvatar(req, res) {
    if (!(await Student.exists(req.params.id))) return fail(res, 'Student not found.', 404);
    if (!req.file) return fail(res, 'No image file uploaded (field "avatar").', 422);
    const url = `/uploads/students/${req.file.filename}`;
    await Student.update(req.params.id, { avatar: url });
    return success(res, { data: { avatar: url } }, 'Profile image updated.');
  },
};

module.exports = StudentController;

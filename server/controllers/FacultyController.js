/**
 * FacultyController — CRUD + schedule assignment for /api/faculty, via FacultyModel.
 */
const Faculty = require('../models/FacultyModel');
const { fileUrl } = require('../middleware/upload');
const { success, created, fail } = require('../utils/response');

const FacultyController = {
  async getAll(req, res) {
    return success(res, { data: await Faculty.findAll() }, 'Faculty fetched.');
  },

  async getById(req, res) {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return fail(res, 'Faculty not found.', 404);
    return success(res, { data: faculty }, 'Faculty fetched.');
  },

  async create(req, res) {
    return created(res, { data: await Faculty.create(req.body) }, 'Faculty added.');
  },

  async update(req, res) {
    if (!(await Faculty.exists(req.params.id))) return fail(res, 'Faculty not found.', 404);
    return success(res, { data: await Faculty.update(req.params.id, req.body) }, 'Faculty updated.');
  },

  // POST /faculty/:id/schedule  { schedule: [...] }
  async assignSchedule(req, res) {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return fail(res, 'Faculty not found.', 404);
    return success(res, { data: { facultyId: faculty.id, schedule: req.body } }, 'Schedule assigned.');
  },

  // POST /faculty/:id/upload-avatar  (multipart, field "avatar")
  async uploadAvatar(req, res) {
    if (!(await Faculty.exists(req.params.id))) return fail(res, 'Faculty not found.', 404);
    if (!req.file) return fail(res, 'No image file uploaded (field "avatar").', 422);
    const url = fileUrl('faculty', req.file);
    await Faculty.update(req.params.id, { avatar: url });
    return success(res, { data: { avatar: url } }, 'Faculty photo updated.');
  },
};

module.exports = FacultyController;

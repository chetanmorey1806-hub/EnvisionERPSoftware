/**
 * StaffController — CRUD + permissions update for /api/staff, via StaffModel.
 * permissions is stored as a JSON array of permission keys.
 */
const Staff = require('../models/StaffModel');
const { success, created, fail } = require('../utils/response');

const StaffController = {
  async getAll(req, res) {
    return success(res, { data: await Staff.findAll() }, 'Staff fetched.');
  },

  async getById(req, res) {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return fail(res, 'Staff member not found.', 404);
    return success(res, { data: staff }, 'Staff fetched.');
  },

  async create(req, res) {
    const payload = { ...req.body };
    if (payload.permissions !== undefined) payload.permissions = JSON.stringify(payload.permissions);
    return created(res, { data: await Staff.create(payload) }, 'Staff member added.');
  },

  async update(req, res) {
    if (!(await Staff.exists(req.params.id))) return fail(res, 'Staff member not found.', 404);
    return success(res, { data: await Staff.update(req.params.id, req.body) }, 'Staff updated.');
  },

  // PATCH /staff/:id/permissions  { permissions: [...] }
  async updatePermissions(req, res) {
    if (!(await Staff.exists(req.params.id))) return fail(res, 'Staff member not found.', 404);
    const { permissions } = req.body || {};
    if (!Array.isArray(permissions)) return fail(res, 'permissions must be an array.', 422);
    const updated = await Staff.update(req.params.id, { permissions: JSON.stringify(permissions) });
    return success(res, { data: updated }, 'Permissions updated.');
  },
};

module.exports = StaffController;

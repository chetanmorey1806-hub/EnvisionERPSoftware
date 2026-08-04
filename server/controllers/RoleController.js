/**
 * RoleController — /api/roles
 * Roles and their permission grants are fully data-driven and editable.
 */
const RoleModel = require('../models/RoleModel');
const { success, created, fail } = require('../utils/response');

const RoleController = {
  // GET /roles  -> roles with live permission/user counts
  async list(req, res) {
    return success(res, { data: await RoleModel.listWithCounts() }, 'Roles fetched.');
  },

  // GET /roles/permissions -> the full permission catalog grouped by module
  async permissions(req, res) {
    const perms = await RoleModel.allPermissions();
    const grouped = perms.reduce((acc, p) => {
      (acc[p.module] ||= []).push(p);
      return acc;
    }, {});
    return success(res, { data: { permissions: perms, grouped } }, 'Permissions fetched.');
  },

  // GET /roles/:id -> role + its granted permission names
  async getById(req, res) {
    const role = await RoleModel.findById(req.params.id);
    if (!role) return fail(res, 'Role not found.', 404);
    const permissions = await RoleModel.permissionNamesForRole(role.id);
    return success(res, { data: { ...role, permissions } }, 'Role fetched.');
  },

  // POST /roles  { name, label, description?, permissions?[] }
  async create(req, res) {
    const { name, label, description, permissions } = req.body || {};
    if (!name || !label) return fail(res, 'Role name and label are required.', 422);
    if (await RoleModel.findByName(name)) return fail(res, 'A role with this name already exists.', 409);

    const role = await RoleModel.create({ name, label, description });
    if (Array.isArray(permissions)) await RoleModel.setPermissions(role.id, permissions);
    return created(res, { data: role }, 'Role created.');
  },

  // PUT /roles/:id  { label?, description? }
  async update(req, res) {
    const role = await RoleModel.findById(req.params.id);
    if (!role) return fail(res, 'Role not found.', 404);
    const updated = await RoleModel.update(role.id, req.body || {});
    return success(res, { data: updated }, 'Role updated.');
  },

  // PUT /roles/:id/permissions  { permissions: ['students.view', ...] }
  async setPermissions(req, res) {
    const role = await RoleModel.findById(req.params.id);
    if (!role) return fail(res, 'Role not found.', 404);
    const { permissions } = req.body || {};
    if (!Array.isArray(permissions)) return fail(res, 'permissions must be an array.', 422);

    const count = await RoleModel.setPermissions(role.id, permissions);
    return success(res, { data: { roleId: role.id, granted: count } }, 'Role permissions updated.');
  },

  // DELETE /roles/:id  (system roles are protected)
  async delete(req, res) {
    const role = await RoleModel.findById(req.params.id);
    if (!role) return fail(res, 'Role not found.', 404);
    if (role.is_system) return fail(res, 'System roles cannot be deleted.', 403);
    await RoleModel.remove(role.id);
    return success(res, {}, 'Role deleted.');
  },
};

module.exports = RoleController;

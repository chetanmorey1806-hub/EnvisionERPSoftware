/**
 * Validation schemas for the Users (admin) module.
 */
// Must match the roles seeded in config/seedRbac.js, or an admin cannot create
// the very accounts the RBAC matrix defines.
const ROLES = [
  'super_admin', 'admin', 'faculty', 'staff', 'student', 'placement',
  'branch_head', 'registrar', 'coordinator',
  'accountant', 'librarian', 'teaching_assistant',
];

module.exports = {
  create: {
    name: { required: true, type: 'string', min: 2, max: 120, label: 'Name' },
    email: { required: true, type: 'email', label: 'Email' },
    password: { required: true, type: 'string', min: 6, max: 64, label: 'Password' },
    role: { enum: ROLES, label: 'Role' },
    phone: { type: 'string', max: 20, label: 'Phone' },
  },

  update: {
    name: { type: 'string', min: 2, max: 120, label: 'Name' },
    email: { type: 'email', label: 'Email' },
    role: { enum: ROLES, label: 'Role' },
    status: { enum: ['active', 'inactive', 'suspended'], label: 'Status' },
    phone: { type: 'string', max: 20, label: 'Phone' },
  },
};

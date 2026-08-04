/**
 * Validation schemas for the Students module.
 */
const STATUSES = ['active', 'inactive', 'completed', 'graduated', 'dropped', 'suspended'];

// Same optional fields on create and update — keeps the two in lock-step so a
// field accepted by one is never silently rejected by the other.
const shared = {
  email: { type: 'email', label: 'Email' },
  phone: { type: 'string', max: 20, label: 'Phone' },
  gender: { enum: ['male', 'female', 'other'], label: 'Gender' },
  address: { type: 'string', max: 255, label: 'Address' },
  guardian_name: { type: 'string', max: 120, label: 'Guardian name' },
  guardian_phone: { type: 'string', max: 20, label: 'Guardian phone' },
  qualification: { type: 'string', max: 120, label: 'Qualification' },
  course_id: { type: 'number', min: 1, label: 'Course' },
  batch_id: { type: 'number', min: 1, label: 'Batch' },
  status: { enum: STATUSES, label: 'Status' },
};

module.exports = {
  create: {
    name: { required: true, type: 'string', min: 2, max: 120, label: 'Name' },
    ...shared,
  },

  update: {
    name: { type: 'string', min: 2, max: 120, label: 'Name' },
    ...shared,
  },
};

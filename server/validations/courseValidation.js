/**
 * Validation schemas for the Courses module.
 */
module.exports = {
  create: {
    code: { required: true, type: 'string', min: 2, max: 40, label: 'Course code' },
    title: { required: true, type: 'string', min: 2, max: 180, label: 'Title' },
    credits: { type: 'number', min: 0, max: 100, label: 'Credits' },
    fee: { type: 'number', min: 0, label: 'Fee' },
    status: { enum: ['active', 'archived'], label: 'Status' },
  },

  update: {
    code: { type: 'string', min: 2, max: 40, label: 'Course code' },
    title: { type: 'string', min: 2, max: 180, label: 'Title' },
    credits: { type: 'number', min: 0, max: 100, label: 'Credits' },
    fee: { type: 'number', min: 0, label: 'Fee' },
    status: { enum: ['active', 'archived'], label: 'Status' },
  },
};

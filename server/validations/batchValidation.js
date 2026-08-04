/**
 * Validation schemas for the Batches module.
 */
module.exports = {
  create: {
    code: { required: true, type: 'string', min: 2, max: 40, label: 'Batch code' },
    name: { required: true, type: 'string', min: 2, max: 160, label: 'Batch name' },
    course_id: { type: 'number', min: 1, label: 'Course' },
    faculty_id: { type: 'number', min: 1, label: 'Faculty' },
    capacity: { type: 'number', min: 0, label: 'Capacity' },
    status: { enum: ['active', 'completed', 'cancelled'], label: 'Status' },
  },

  assignFaculty: {
    facultyId: { required: true, type: 'number', min: 1, label: 'Faculty' },
  },
};

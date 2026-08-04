/**
 * Validation schemas for the Lead Management (enquiries) module.
 */
const TEMPERATURES = ['hot', 'warm', 'cold'];
const STATUSES = ['new', 'contacted', 'converted', 'closed'];

module.exports = {
  create: {
    name: { required: true, type: 'string', min: 2, max: 120, label: 'Name' },
    phone: { required: true, type: 'string', min: 6, max: 20, label: 'Phone' },
    email: { type: 'email', label: 'Email' },
    course_id: { type: 'number', min: 1, label: 'Course preference' },
    qualification: { type: 'string', max: 120, label: 'Qualification' },
    occupation: { type: 'string', max: 120, label: 'Occupation' },
    source: { type: 'string', max: 80, label: 'Lead source' },
    temperature: { enum: TEMPERATURES, label: 'Lead temperature' },
    status: { enum: STATUSES, label: 'Status' },
  },

  update: {
    name: { type: 'string', min: 2, max: 120, label: 'Name' },
    phone: { type: 'string', min: 6, max: 20, label: 'Phone' },
    email: { type: 'email', label: 'Email' },
    course_id: { type: 'number', min: 1, label: 'Course preference' },
    temperature: { enum: TEMPERATURES, label: 'Lead temperature' },
    status: { enum: STATUSES, label: 'Status' },
  },
};

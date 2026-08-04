const BaseModel = require('./BaseModel');

module.exports = new BaseModel('enquiries', [
  'name', 'email', 'phone', 'course_interest', 'source', 'status', 'assigned_to', 'notes',
]);

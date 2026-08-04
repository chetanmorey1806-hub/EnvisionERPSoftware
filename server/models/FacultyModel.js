const BaseModel = require('./BaseModel');

module.exports = new BaseModel('faculty', [
  'employee_no', 'name', 'email', 'phone', 'department', 'designation',
  'specialization', 'qualification', 'experience', 'status', 'joined_at', 'avatar',
]);

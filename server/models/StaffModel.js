const BaseModel = require('./BaseModel');

module.exports = new BaseModel('staff', [
  'employee_no', 'name', 'email', 'phone', 'department', 'designation', 'permissions', 'status',
]);

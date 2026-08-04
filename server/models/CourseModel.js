const BaseModel = require('./BaseModel');

module.exports = new BaseModel('courses', [
  'code', 'title', 'credits', 'department', 'duration', 'fee', 'description', 'status',
]);

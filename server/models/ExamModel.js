const BaseModel = require('./BaseModel');

module.exports = new BaseModel('exams', [
  'title', 'batch_id', 'course_id', 'exam_date', 'total_marks', 'passing_marks', 'type', 'status',
]);

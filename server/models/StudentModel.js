const BaseModel = require('./BaseModel');

class StudentModel extends BaseModel {
  constructor() {
    super('students', [
      'admission_no', 'name', 'email', 'phone', 'dob', 'gender', 'address',
      'guardian_name', 'guardian_phone', 'qualification',
      'course_id', 'batch_id', 'status', 'admission_date', 'avatar',
    ]);
  }

  /** List with course/batch names + optional filters (search/status/batch/course). */
  listWithRelations({ search, status, batchId, courseId } = {}) {
    const where = [];
    const params = [];
    if (search) {
      where.push('(s.name LIKE ? OR s.email LIKE ? OR s.admission_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { where.push('s.status = ?'); params.push(status); }
    if (batchId) { where.push('s.batch_id = ?'); params.push(batchId); }
    if (courseId) { where.push('s.course_id = ?'); params.push(courseId); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return this.raw(
      `SELECT s.*, c.title AS course_name, b.name AS batch_name
       FROM students s
       LEFT JOIN courses c ON c.id = s.course_id
       LEFT JOIN batches b ON b.id = s.batch_id
       ${clause}
       ORDER BY s.id DESC`,
      params
    );
  }
}

module.exports = new StudentModel();

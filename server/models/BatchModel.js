const BaseModel = require('./BaseModel');

/** JSON columns must be serialised before binding. */
const serialise = (data = {}) =>
  Array.isArray(data.days_of_week)
    ? { ...data, days_of_week: JSON.stringify(data.days_of_week) }
    : data;

class BatchModel extends BaseModel {
  constructor() {
    super('batches', [
      'code', 'name', 'course_id', 'faculty_id', 'classroom_id', 'timeline',
      'start_time', 'end_time', 'days_of_week',
      'start_date', 'end_date', 'capacity', 'status',
    ]);
  }

  create(data) { return super.create(serialise(data)); }

  update(id, data) { return super.update(id, serialise(data)); }

  /** Batches enriched with course/faculty names and live student counts. */
  listWithRelations() {
    return this.raw(
      `SELECT b.*, c.title AS course_name, f.name AS faculty_name,
              r.code AS classroom_code, r.name AS classroom_name, r.capacity AS classroom_capacity,
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) AS student_count
       FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id
       LEFT JOIN faculty f ON f.id = b.faculty_id
       LEFT JOIN classrooms r ON r.id = b.classroom_id
       ORDER BY b.id DESC`
    );
  }
}

module.exports = new BatchModel();

/**
 * ExamController — list/create/update + hall ticket for /api/exams, via ExamModel.
 */
const Exam = require('../models/ExamModel');
const { success, created, fail } = require('../utils/response');

const ExamController = {
  async getAll(req, res) {
    const { batchId, status } = req.query;
    const where = [];
    const params = [];
    if (batchId) { where.push('batch_id = ?'); params.push(batchId); }
    if (status) { where.push('status = ?'); params.push(status); }
    const opts = where.length ? { where: where.join(' AND '), params } : {};
    return success(res, { data: await Exam.findAll(opts) }, 'Exams fetched.');
  },

  async create(req, res) {
    return created(res, { data: await Exam.create(req.body) }, 'Exam scheduled.');
  },

  async update(req, res) {
    if (!(await Exam.exists(req.params.id))) return fail(res, 'Exam not found.', 404);
    return success(res, { data: await Exam.update(req.params.id, req.body) }, 'Exam updated.');
  },

  // GET /exams/:examId/hall-ticket/:studentId
  async getHallTicket(req, res) {
    const { examId, studentId } = req.params;
    const rows = await Exam.raw(
      `SELECT e.title AS exam_title, e.exam_date, e.total_marks,
              s.name AS student_name, s.admission_no,
              b.name AS batch_name, c.title AS course_name
       FROM exams e
       LEFT JOIN students s ON s.id = ?
       LEFT JOIN batches b ON b.id = e.batch_id
       LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.id = ? LIMIT 1`,
      [studentId, examId]
    );
    if (!rows.length) return fail(res, 'Exam not found.', 404);
    const hallTicket = { ...rows[0], hall_ticket_no: `HT-${examId}-${String(studentId).padStart(4, '0')}` };
    return success(res, { data: hallTicket }, 'Hall ticket generated.');
  },
};

module.exports = ExamController;

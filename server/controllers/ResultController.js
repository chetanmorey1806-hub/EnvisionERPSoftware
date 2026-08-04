/**
 * ResultController — /api/results (resultApi.js).
 */
const { findById, query } = require('../utils/crud');
const { success, fail } = require('../utils/response');

function gradeFor(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

const ResultController = {
  // GET /results/batch/:batchId/exam/:examId
  async getBatchResults(req, res) {
    const { batchId, examId } = req.params;
    const rows = await query(
      `SELECT s.id AS student_id, s.name, s.admission_no,
              m.marks_obtained, m.grade, m.remarks,
              e.total_marks, e.passing_marks
       FROM students s
       CROSS JOIN exams e
       LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = e.id
       WHERE s.batch_id = ? AND e.id = ?
       ORDER BY s.name ASC`,
      [batchId, examId]
    );
    return success(res, { data: rows }, 'Batch results fetched.');
  },

  // POST /results/upload  { examId, marks: [{ studentId, marks }] }
  async uploadMarks(req, res) {
    const { examId, marks } = req.body || {};
    if (!examId || !Array.isArray(marks)) return fail(res, 'examId and marks[] are required.', 422);
    const exam = await findById('exams', examId);
    if (!exam) return fail(res, 'Exam not found.', 404);

    let saved = 0;
    for (const m of marks) {
      if (!m.studentId || m.marks === undefined) continue;
      const pct = exam.total_marks ? (Number(m.marks) / Number(exam.total_marks)) * 100 : 0;
      const grade = m.grade || gradeFor(pct);
      await query(
        `INSERT INTO marks (exam_id, student_id, marks_obtained, grade, remarks)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained),
                                 grade = VALUES(grade), remarks = VALUES(remarks)`,
        [examId, m.studentId, m.marks, grade, m.remarks || null]
      );
      saved += 1;
    }
    return success(res, { data: { saved } }, `Marks uploaded for ${saved} students.`);
  },

  // GET /results/student/:studentId  -> report card across all exams
  async getStudentReportCard(req, res) {
    const student = await findById('students', req.params.studentId);
    if (!student) return fail(res, 'Student not found.', 404);
    const rows = await query(
      `SELECT e.title AS exam_title, e.exam_date, e.total_marks, e.passing_marks,
              m.marks_obtained, m.grade
       FROM marks m
       JOIN exams e ON e.id = m.exam_id
       WHERE m.student_id = ?
       ORDER BY e.exam_date DESC`,
      [req.params.studentId]
    );
    return success(res, { data: { student, results: rows } }, 'Report card fetched.');
  },
};

module.exports = ResultController;

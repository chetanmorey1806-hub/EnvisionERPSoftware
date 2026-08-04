/**
 * CourseController — CRUD for /api/courses, via CourseModel.
 */
const Course = require('../models/CourseModel');
const { query } = require('../config/db');
const { createCourseWithSchedule } = require('../services/CourseSetupService');
const { success, created, fail } = require('../utils/response');

const CourseController = {
  /** Courses enriched with their scheduled batches, trainers and enrolment. */
  async getAll(req, res) {
    const rows = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM batches b WHERE b.course_id = c.id) AS batch_count,
              (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id) AS student_count,
              (SELECT GROUP_CONCAT(DISTINCT f.name SEPARATOR ', ')
                 FROM batches b JOIN faculty f ON f.id = b.faculty_id
                WHERE b.course_id = c.id AND b.status = 'active')       AS trainers,
              (SELECT MIN(b.start_date) FROM batches b WHERE b.course_id = c.id) AS starts_on,
              (SELECT MAX(b.end_date)   FROM batches b WHERE b.course_id = c.id) AS ends_on
       FROM courses c ORDER BY c.id DESC`
    );
    return success(res, { data: rows }, 'Courses fetched.');
  },

  /**
   * POST /courses/full
   * { course: {...}, batch?: {...}, syllabus?: [{topic, hours}] }
   * Creates the curriculum AND its first scheduled batch atomically.
   */
  async createFull(req, res) {
    try {
      const out = await createCourseWithSchedule(req.body || {}, { createdBy: req.user?.id });
      const msg = out.batch
        ? `Course "${out.course.title}" created and scheduled as batch ${out.batch.code}.`
        : `Course "${out.course.title}" created. Schedule a batch to start classes.`;
      return created(res, { data: out }, msg);
    } catch (err) {
      // Surface the clashing trainer/room so the UI can show an error banner.
      if (err.status === 409 && err.conflict) return fail(res, err.message, 409, { conflict: err.conflict });
      throw err;
    }
  },

  async getById(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) return fail(res, 'Course not found.', 404);
    return success(res, { data: course }, 'Course fetched.');
  },

  async create(req, res) {
    const course = await Course.create(req.body);
    return created(res, { data: course }, 'Course created.');
  },

  async update(req, res) {
    if (!(await Course.exists(req.params.id))) return fail(res, 'Course not found.', 404);
    return success(res, { data: await Course.update(req.params.id, req.body) }, 'Course updated.');
  },

  async delete(req, res) {
    if (!(await Course.remove(req.params.id))) return fail(res, 'Course not found.', 404);
    return success(res, {}, 'Course deleted.');
  },
};

module.exports = CourseController;

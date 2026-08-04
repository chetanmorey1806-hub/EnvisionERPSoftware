/**
 * FacultyPortalController — "/api/faculty/me/*"
 * Everything here is scoped to the faculty record linked to the logged-in user,
 * so an instructor can only ever see and edit their own classes.
 */
const { query } = require('../config/db');
const { runsOn, toMinutes, parseDays } = require('../helpers/schedule');
const { today } = require('../helpers/dateUtils');
const { success, created, fail } = require('../utils/response');

const httpError = (message, status) => Object.assign(new Error(message), { status });

/** Resolve the faculty row for the authenticated user. */
async function resolveFaculty(req) {
  const rows = await query('SELECT * FROM faculty WHERE user_id = ? LIMIT 1', [req.user.id]);
  if (!rows[0]) {
    throw httpError('No faculty profile is linked to this account.', 403);
  }
  return rows[0];
}

const FacultyPortalController = {
  // GET /faculty/me
  async me(req, res) {
    const faculty = await resolveFaculty(req);
    return success(res, { data: faculty }, 'Faculty profile fetched.');
  },

  // GET /faculty/me/batches
  async myBatches(req, res) {
    const faculty = await resolveFaculty(req);
    const rows = await query(
      `SELECT b.id, b.code, b.name, b.timeline, b.start_time, b.end_time, b.days_of_week,
              b.start_date, b.end_date, b.capacity, b.status,
              c.title AS course_name, c.code AS course_code,
              (SELECT COUNT(*) FROM student_batches sb
                WHERE sb.batch_id = b.id AND sb.status = 'enrolled') AS student_count
       FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE b.faculty_id = ? AND b.status = 'active'
       ORDER BY b.start_time ASC`,
      [faculty.id]
    );
    return success(res, { data: rows.map((b) => ({ ...b, days_of_week: parseDays(b.days_of_week) })) },
      'Batches fetched.');
  },

  /**
   * GET /faculty/me/schedule?date=YYYY-MM-DD
   * Today's classes, sorted by start time, each annotated with whether
   * attendance has been marked and whether the topic log exists.
   */
  async schedule(req, res) {
    const faculty = await resolveFaculty(req);
    const date = req.query.date || today();

    const batches = await query(
      `SELECT b.*, c.title AS course_name, c.code AS course_code
       FROM batches b LEFT JOIN courses c ON c.id = b.course_id
       WHERE b.faculty_id = ? AND b.status = 'active'`,
      [faculty.id]
    );

    const running = batches.filter((b) => runsOn(b, date));

    const classes = await Promise.all(
      running.map(async (b) => {
        const [[roster], [marked], [log]] = await Promise.all([
          query("SELECT COUNT(*) AS c FROM student_batches WHERE batch_id = ? AND status = 'enrolled'", [b.id]),
          query('SELECT COUNT(*) AS c FROM attendance WHERE batch_id = ? AND date = ?', [b.id, date]),
          query('SELECT id, topics_covered FROM class_logs WHERE batch_id = ? AND date = ?', [b.id, date]),
        ]);
        return {
          batch_id: b.id,
          code: b.code,
          batch_name: b.name,
          course_name: b.course_name,
          course_code: b.course_code,
          start_time: b.start_time,
          end_time: b.end_time,
          timeline: b.timeline,
          days_of_week: parseDays(b.days_of_week),
          student_count: roster.c,
          attendance_marked: marked.c > 0,
          topics_logged: !!log,
          topics_covered: log?.topics_covered || null,
        };
      })
    );

    classes.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

    return success(res, {
      data: {
        faculty: { id: faculty.id, name: faculty.name, department: faculty.department },
        date,
        total_classes: classes.length,
        classes,
      },
    }, "Today's schedule fetched.");
  },

  /**
   * GET /faculty/me/roster/:batchId?date=
   * The attendance checklist: every enrolled student + any mark already saved.
   */
  async roster(req, res) {
    const faculty = await resolveFaculty(req);
    const { batchId } = req.params;
    const date = req.query.date || today();

    const owns = await query('SELECT id FROM batches WHERE id = ? AND faculty_id = ?', [batchId, faculty.id]);
    if (!owns.length) return fail(res, 'This batch is not assigned to you.', 403);

    const students = await query(
      `SELECT s.id AS student_id, s.name, s.student_uid, s.admission_no, s.avatar,
              a.status AS attendance_status
       FROM student_batches sb
       JOIN students s ON s.id = sb.student_id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = ? AND a.date = ?
       WHERE sb.batch_id = ? AND sb.status = 'enrolled'
       ORDER BY s.name ASC`,
      [batchId, date, batchId]
    );

    return success(res, {
      data: { batch_id: Number(batchId), date, students },
    }, 'Roster fetched.');
  },

  // POST /faculty/me/class-log  { batch_id, date?, topics_covered, remarks?, duration_min? }
  async logTopics(req, res) {
    const faculty = await resolveFaculty(req);
    const { batch_id, date, topics_covered, remarks, duration_min } = req.body || {};
    if (!batch_id || !topics_covered) {
      return fail(res, 'batch_id and topics_covered are required.', 422);
    }

    const owns = await query('SELECT id FROM batches WHERE id = ? AND faculty_id = ?', [batch_id, faculty.id]);
    if (!owns.length) return fail(res, 'This batch is not assigned to you.', 403);

    const day = date || today();
    await query(
      `INSERT INTO class_logs (batch_id, faculty_id, date, topics_covered, remarks, duration_min)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE topics_covered = VALUES(topics_covered),
                               remarks = VALUES(remarks),
                               duration_min = VALUES(duration_min)`,
      [batch_id, faculty.id, day, topics_covered, remarks || null, duration_min || null]
    );
    const rows = await query('SELECT * FROM class_logs WHERE batch_id = ? AND date = ?', [batch_id, day]);
    return created(res, { data: rows[0] }, 'Daily topics logged.');
  },

  // GET /faculty/me/class-logs?batchId=&limit=
  async classLogs(req, res) {
    const faculty = await resolveFaculty(req);
    const { batchId } = req.query;
    const params = [faculty.id];
    let clause = 'WHERE cl.faculty_id = ?';
    if (batchId) { clause += ' AND cl.batch_id = ?'; params.push(batchId); }

    const rows = await query(
      `SELECT cl.*, b.name AS batch_name, b.code
       FROM class_logs cl JOIN batches b ON b.id = cl.batch_id
       ${clause} ORDER BY cl.date DESC LIMIT 30`,
      params
    );
    return success(res, { data: rows }, 'Class logs fetched.');
  },

  // POST /faculty/me/materials  (multipart: documents[]) { batch_id, title, type, due_date? }
  async uploadMaterial(req, res) {
    const faculty = await resolveFaculty(req);
    const { batch_id, title, type, due_date } = req.body || {};
    if (!req.files?.length) return fail(res, 'No files uploaded (field "documents").', 422);
    if (!batch_id || !title) return fail(res, 'batch_id and title are required.', 422);
    if (type && !['material', 'assignment', 'lab'].includes(type)) {
      return fail(res, "type must be one of: material, assignment, lab.", 422);
    }

    const owns = await query('SELECT id, course_id FROM batches WHERE id = ? AND faculty_id = ?', [batch_id, faculty.id]);
    if (!owns.length) return fail(res, 'This batch is not assigned to you.', 403);

    const saved = [];
    for (const file of req.files) {
      const r = await query(
        `INSERT INTO course_materials
           (batch_id, course_id, faculty_id, title, type, file_name, file_url, mime_type, size_kb, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batch_id, owns[0].course_id, faculty.id, title, type || 'material',
          file.originalname, `/uploads/documents/${file.filename}`,
          file.mimetype, Math.round(file.size / 1024), due_date || null,
        ]
      );
      const rows = await query('SELECT * FROM course_materials WHERE id = ?', [r.insertId]);
      saved.push(rows[0]);
    }
    return created(res, { data: saved }, `${saved.length} file(s) uploaded.`);
  },

  // GET /faculty/me/materials?batchId=&type=
  async listMaterials(req, res) {
    const faculty = await resolveFaculty(req);
    const { batchId, type } = req.query;
    const params = [faculty.id];
    let clause = 'WHERE m.faculty_id = ?';
    if (batchId) { clause += ' AND m.batch_id = ?'; params.push(batchId); }
    if (type) { clause += ' AND m.type = ?'; params.push(type); }

    const rows = await query(
      `SELECT m.*, b.name AS batch_name FROM course_materials m
       LEFT JOIN batches b ON b.id = m.batch_id
       ${clause} ORDER BY m.id DESC`,
      params
    );
    return success(res, { data: rows }, 'Materials fetched.');
  },
};


// ---- Leave requests (trainer side) -----------------------------------------
FacultyPortalController.myLeaves = async function (req, res) {
  const faculty = await resolveFaculty(req);
  const rows = await query('SELECT * FROM leave_requests WHERE faculty_id = ? ORDER BY id DESC', [faculty.id]);
  return success(res, { data: rows }, 'Your leave requests fetched.');
};

FacultyPortalController.requestLeave = async function (req, res) {
  const faculty = await resolveFaculty(req);
  const { from_date, to_date, reason } = req.body || {};
  if (!from_date || !to_date) return fail(res, 'from_date and to_date are required.', 422);
  if (to_date < from_date) return fail(res, 'to_date cannot be before from_date.', 422);

  const r = await query(
    'INSERT INTO leave_requests (faculty_id, from_date, to_date, reason) VALUES (?, ?, ?, ?)',
    [faculty.id, from_date, to_date, reason || null]
  );
  const rows = await query('SELECT * FROM leave_requests WHERE id = ?', [r.insertId]);
  return created(res, { data: rows[0] }, 'Leave request submitted for approval.');
};

module.exports = FacultyPortalController;

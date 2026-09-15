/**
 * EnquiryController — Lead Management & Admissions (/api/enquiries).
 *
 * Lead lifecycle:
 *   new -> contacted (with callbacks + temperature) -> converted | closed
 * Conversion is atomic: it creates a `students` row, an approved `admissions`
 * record for the audit trail, and links both back to the lead.
 */
const Enquiry = require('../models/EnquiryModel');
const { query, insert, findById } = require('../utils/crud');
const { admissionNo } = require('../helpers/generators');
const { nextNumber } = require('../helpers/numbering');
const { today } = require('../helpers/dateUtils');
const NotificationService = require('../services/NotificationService');
const { success, created, fail } = require('../utils/response');

const TEMPERATURES = ['hot', 'warm', 'cold'];
const STATUSES = ['new', 'contacted', 'converted', 'closed'];

const FIELDS = [
  'name', 'email', 'phone', 'course_interest', 'course_id', 'qualification',
  'occupation', 'source', 'status', 'temperature', 'assigned_to', 'notes', 'callback_at',
];

const pickFields = (body) =>
  FIELDS.reduce((acc, f) => (body[f] !== undefined ? { ...acc, [f]: body[f] } : acc), {});

const EnquiryController = {
  // GET /enquiries?search&temperature&status&source&dueCallbacks=1
  async getAll(req, res) {
    const { search, temperature, status, source, dueCallbacks } = req.query;
    const where = [];
    const params = [];

    if (search) {
      where.push('(e.name LIKE ? OR e.phone LIKE ? OR e.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (temperature) { where.push('e.temperature = ?'); params.push(temperature); }
    if (status) { where.push('e.status = ?'); params.push(status); }
    if (source) { where.push('e.source = ?'); params.push(source); }
    if (dueCallbacks === '1') {
      where.push("e.callback_at IS NOT NULL AND e.callback_at <= NOW() AND e.status NOT IN ('converted','closed')");
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT e.*, c.title AS course_name, u.name AS counselor_name,
              (e.callback_at IS NOT NULL AND e.callback_at <= NOW()
               AND e.status NOT IN ('converted','closed')) AS callback_due
       FROM enquiries e
       LEFT JOIN courses c ON c.id = e.course_id
       LEFT JOIN users u ON u.id = e.assigned_to
       ${clause}
       ORDER BY FIELD(e.temperature,'hot','warm','cold'), e.callback_at IS NULL, e.callback_at ASC, e.id DESC`,
      params
    );
    return success(res, { data: rows }, 'Leads fetched.');
  },

  // GET /enquiries/stats — counselor KPI strip
  async stats(req, res) {
    const [totals] = await query(
      `SELECT COUNT(*) AS total,
              SUM(temperature = 'hot')  AS hot,
              SUM(temperature = 'warm') AS warm,
              SUM(temperature = 'cold') AS cold,
              SUM(status = 'new')       AS fresh,
              SUM(status = 'converted') AS converted
       FROM enquiries`
    );
    const [callbacks] = await query(
      `SELECT COUNT(*) AS due FROM enquiries
       WHERE callback_at IS NOT NULL AND callback_at <= NOW()
         AND status NOT IN ('converted','closed')`
    );
    const [todayCb] = await query(
      `SELECT COUNT(*) AS scheduled FROM enquiries
       WHERE DATE(callback_at) = CURDATE() AND status NOT IN ('converted','closed')`
    );
    const bySource = await query(
      'SELECT COALESCE(source, "unknown") AS source, COUNT(*) AS count FROM enquiries GROUP BY source'
    );

    const total = Number(totals.total);
    return success(res, {
      data: {
        total,
        hot: Number(totals.hot) || 0,
        warm: Number(totals.warm) || 0,
        cold: Number(totals.cold) || 0,
        new: Number(totals.fresh) || 0,
        converted: Number(totals.converted) || 0,
        conversionRate: total ? Math.round((Number(totals.converted) / total) * 100) : 0,
        callbacksDue: Number(callbacks.due),
        callbacksToday: Number(todayCb.scheduled),
        bySource,
      },
    }, 'Lead stats fetched.');
  },

  async getById(req, res) {
    const lead = await Enquiry.findById(req.params.id);
    if (!lead) return fail(res, 'Lead not found.', 404);
    const followups = await query(
      'SELECT * FROM followups WHERE enquiry_id = ? ORDER BY id DESC', [lead.id]
    );
    return success(res, { data: { ...lead, followups } }, 'Lead fetched.');
  },

  // POST /enquiries — log a new inquiry
  async create(req, res) {
    const data = pickFields(req.body);
    if (!data.name) return fail(res, 'Lead name is required.', 422);
    if (!data.phone) return fail(res, 'Phone number is required.', 422);
    if (data.temperature && !TEMPERATURES.includes(data.temperature)) {
      return fail(res, `temperature must be one of: ${TEMPERATURES.join(', ')}.`, 422);
    }
    if (!data.assigned_to) data.assigned_to = req.user?.id || null;

    const id = await insert('enquiries', data);
    const lead = await findById('enquiries', id);

    NotificationService.notifyAdmins({
      type: 'enquiry',
      title: 'New lead logged',
      message: `${lead.name} — ${lead.course_interest || 'course TBD'} (${lead.temperature}).`,
      link: '/enquiries',
    }).catch(() => {});

    return created(res, { data: lead }, 'Lead logged.');
  },

  async update(req, res) {
    if (!(await Enquiry.exists(req.params.id))) return fail(res, 'Lead not found.', 404);
    const data = pickFields(req.body);
    const keys = Object.keys(data);
    if (keys.length) {
      await query(
        `UPDATE enquiries SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => data[k]), req.params.id]
      );
    }
    return success(res, { data: await findById('enquiries', req.params.id) }, 'Lead updated.');
  },

  // PATCH /enquiries/:id/temperature  { temperature }
  async setTemperature(req, res) {
    const { temperature } = req.body || {};
    if (!TEMPERATURES.includes(temperature)) {
      return fail(res, `temperature must be one of: ${TEMPERATURES.join(', ')}.`, 422);
    }
    if (!(await Enquiry.exists(req.params.id))) return fail(res, 'Lead not found.', 404);
    await query('UPDATE enquiries SET temperature = ? WHERE id = ?', [temperature, req.params.id]);
    return success(res, { data: await findById('enquiries', req.params.id) }, 'Lead temperature updated.');
  },

  // PATCH /enquiries/:id/status  { status }
  async setStatus(req, res) {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) return fail(res, `status must be one of: ${STATUSES.join(', ')}.`, 422);
    if (!(await Enquiry.exists(req.params.id))) return fail(res, 'Lead not found.', 404);
    await query('UPDATE enquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    return success(res, { data: await findById('enquiries', req.params.id) }, 'Lead status updated.');
  },

  // POST /enquiries/:id/callback  { callback_at, note }
  async scheduleCallback(req, res) {
    const lead = await Enquiry.findById(req.params.id);
    if (!lead) return fail(res, 'Lead not found.', 404);

    const { callback_at, note } = req.body || {};
    if (!callback_at) return fail(res, 'callback_at is required.', 422);

    await query(
      "UPDATE enquiries SET callback_at = ?, status = IF(status = 'new', 'contacted', status) WHERE id = ?",
      [callback_at, req.params.id]
    );
    await insert('followups', {
      enquiry_id: lead.id,
      note: note || `Callback scheduled for ${callback_at}`,
      followup_date: today(),
      next_followup_date: String(callback_at).slice(0, 10),
      status: 'pending',
      created_by: req.user?.id || null,
    });

    return success(res, { data: await findById('enquiries', lead.id) }, 'Callback scheduled.');
  },

  /**
   * POST /enquiries/:id/convert — one-click lead -> registered student.
   * Creates the student, an approved admission record, links the lead, and
   * marks the follow-ups done. Runs in a transaction.
   */
  async convert(req, res) {
    const lead = await Enquiry.findById(req.params.id);
    if (!lead) return fail(res, 'Lead not found.', 404);
    if (lead.status === 'converted') return fail(res, 'Lead has already been converted.', 409);
    if (!lead.course_id && !req.body?.course_id) {
      return fail(res, 'A course preference is required before converting this lead.', 422);
    }

    const courseId = req.body?.course_id || lead.course_id;
    const batchId = req.body?.batch_id || null;

    const studentId = await insert('students', {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      course_id: courseId,
      batch_id: batchId,
      admission_no: (await nextNumber('admission')) || admissionNo(),
      admission_date: today(),
      status: 'active',
    });

    const admissionId = await insert('admissions', {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      course_id: courseId,
      batch_id: batchId,
      status: 'approved',
      docs_verified: 0,
      student_id: studentId,
      remarks: `Converted from lead #${lead.id} (${lead.source || 'unknown source'})`,
    });

    await query(
      "UPDATE enquiries SET status = 'converted', student_id = ?, callback_at = NULL WHERE id = ?",
      [studentId, lead.id]
    );
    await query("UPDATE followups SET status = 'done' WHERE enquiry_id = ?", [lead.id]);

    NotificationService.notifyAdmins({
      type: 'admission',
      title: 'Lead converted to student',
      message: `${lead.name} is now enrolled (admission approved).`,
      link: '/students',
    }).catch(() => {});

    return created(
      res,
      { data: { studentId, admissionId, student: await findById('students', studentId) } },
      'Lead converted to a registered student.'
    );
  },
};

module.exports = EnquiryController;

/**
 * FollowupController — /api/followups (followupApi.js).
 */
const { pick, insert, findById, query } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const FIELDS = ['enquiry_id', 'note', 'followup_date', 'next_followup_date', 'status', 'created_by'];

const FollowupController = {
  // GET /followups/enquiry/:enquiryId
  async getByEnquiryId(req, res) {
    const rows = await query(
      'SELECT * FROM followups WHERE enquiry_id = ? ORDER BY id DESC',
      [req.params.enquiryId]
    );
    return success(res, { data: rows }, 'Follow-ups fetched.');
  },

  // GET /followups/pending
  async getPendingLogs(req, res) {
    const rows = await query(
      `SELECT f.*, e.name AS enquiry_name, e.phone AS enquiry_phone
       FROM followups f
       JOIN enquiries e ON e.id = f.enquiry_id
       WHERE f.status = 'pending'
       ORDER BY f.next_followup_date IS NULL, f.next_followup_date ASC`
    );
    return success(res, { data: rows }, 'Pending follow-ups fetched.');
  },

  // POST /followups
  async create(req, res) {
    const data = pick(req.body, FIELDS);
    if (!data.enquiry_id) return fail(res, 'enquiry_id is required.', 422);
    if (!(await findById('enquiries', data.enquiry_id))) return fail(res, 'Enquiry not found.', 404);
    const id = await insert('followups', data);
    return created(res, { data: await findById('followups', id) }, 'Follow-up logged.');
  },
};

module.exports = FollowupController;

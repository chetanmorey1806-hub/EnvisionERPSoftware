/**
 * BatchController — CRUD + assign-faculty for /api/batches, via BatchModel.
 */
const Batch = require('../models/BatchModel');
const Faculty = require('../models/FacultyModel');
const { query } = require('../config/db');
const { assertBatchSchedulable, assertTrainerFree, assertTrainerDailyLimit } = require('../services/ConflictService');
const EmailTriggerService = require('../services/EmailTriggerService');
const { success, created, fail } = require('../utils/response');

const BatchController = {
  async getAll(req, res) {
    return success(res, { data: await Batch.listWithRelations() }, 'Batches fetched.');
  },

  async getById(req, res) {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return fail(res, 'Batch not found.', 404);
    return success(res, { data: batch }, 'Batch fetched.');
  },

  /** Conflict Resolution Engine runs BEFORE the row is written. */
  async create(req, res) {
    await assertBatchSchedulable(req.body);
    return created(res, { data: await Batch.create(req.body) }, 'Batch created.');
  },

  async update(req, res) {
    const current = await Batch.findById(req.params.id);
    if (!current) return fail(res, 'Batch not found.', 404);
    // Validate the MERGED row (what it will look like after the save).
    await assertBatchSchedulable({ ...current, ...req.body }, { excludeBatchId: current.id });
    return success(res, { data: await Batch.update(req.params.id, req.body) }, 'Batch updated.');
  },

  /**
   * POST /batches/:id/assign-faculty  { facultyId }
   * Rejects the allocation if it would double-book the trainer: the ERP checks
   * the target batch against every other active batch already assigned to them
   * (dates ∩ weekdays ∩ time-of-day must all intersect to be a conflict).
   */
  async assignFaculty(req, res) {
    const { facultyId } = req.body || {};
    const target = await Batch.findById(req.params.id);
    if (!target) return fail(res, 'Batch not found.', 404);
    if (!(await Faculty.exists(facultyId))) return fail(res, 'Faculty not found.', 404);

    // Isolation check: overlap AND the admin's max-batches-per-day policy.
    await assertTrainerFree(facultyId, target, target.id);
    await assertTrainerDailyLimit(facultyId, target, target.id);

    const updated = await Batch.update(target.id, { faculty_id: facultyId });
    // Notify the trainer of their new allocation (fire-and-forget).
    EmailTriggerService.batchAssignment(facultyId, target.id, { triggeredBy: req.user?.id }).catch(() => {});
    return success(res, { data: updated }, 'Faculty assigned to batch.');
  },
};

module.exports = BatchController;

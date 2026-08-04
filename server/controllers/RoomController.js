/**
 * RoomController — physical classrooms & labs (/api/rooms).
 * Distinct from the `/classroom` module, which is classwork/homework.
 */
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');

const RoomController = {
  // GET /rooms?type=classroom|lab
  async list(req, res) {
    const { type } = req.query;
    const where = type ? 'WHERE type = ?' : '';
    const params = type ? [type] : [];
    const rows = await query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM batches b WHERE b.classroom_id = r.id AND b.status = 'active') AS active_batches
       FROM classrooms r ${where} ORDER BY r.code ASC`,
      params
    );
    return success(res, { data: rows }, 'Rooms fetched.');
  },

  // POST /rooms  { code, name, type, capacity, location }
  async create(req, res) {
    const { code, name, type, capacity, location } = req.body || {};
    if (!code || !name) return fail(res, 'code and name are required.', 422);
    if (type && !['classroom', 'lab'].includes(type)) {
      return fail(res, "type must be 'classroom' or 'lab'.", 422);
    }
    const r = await query(
      'INSERT INTO classrooms (code, name, type, capacity, location) VALUES (?, ?, ?, ?, ?)',
      [code, name, type || 'classroom', Number(capacity) || 0, location || null]
    );
    const rows = await query('SELECT * FROM classrooms WHERE id = ?', [r.insertId]);
    return created(res, { data: rows[0] }, 'Room created.');
  },

  // PUT /rooms/:id
  async update(req, res) {
    const { name, type, capacity, location, status } = req.body || {};
    const r = await query(
      `UPDATE classrooms SET name = COALESCE(?, name), type = COALESCE(?, type),
              capacity = COALESCE(?, capacity), location = COALESCE(?, location),
              status = COALESCE(?, status) WHERE id = ?`,
      [name ?? null, type ?? null, capacity ?? null, location ?? null, status ?? null, req.params.id]
    );
    if (!r.affectedRows) return fail(res, 'Room not found.', 404);
    return success(res, {}, 'Room updated.');
  },
};

module.exports = RoomController;

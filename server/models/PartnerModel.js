/**
 * PartnerModel — corporate partners + their contact people.
 *
 * Deletes are soft (`is_deleted`), so every read must say which side it wants.
 */
const { query } = require('../config/db');

const COLS = `id, name, partner_type, pan, gst, corp_city, corp_state, corp_address,
              venue_address, website, notes, is_deleted, deleted_at, created_at`;

const PartnerModel = {
  /** @param {boolean} deleted  false = live list, true = the "Deleted" view. */
  async list({ search = '', type = '', deleted = false } = {}) {
    const where = ['p.is_deleted = ?'];
    const params = [deleted ? 1 : 0];

    if (search) {
      where.push('(p.name LIKE ? OR p.pan LIKE ? OR p.gst LIKE ? OR p.corp_city LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    if (type) { where.push('p.partner_type = ?'); params.push(type); }

    return query(
      `SELECT p.id, p.name, p.partner_type, p.pan, p.gst, p.corp_city, p.corp_state,
              p.corp_address, p.venue_address, p.website, p.notes,
              p.is_deleted, p.deleted_at, p.created_at,
              (SELECT COUNT(*) FROM partner_contacts c WHERE c.partner_id = p.id) AS contact_count
         FROM partners p
        WHERE ${where.join(' AND ')}
        ORDER BY p.id DESC`,
      params
    );
  },

  async findById(id, { withDeleted = false } = {}) {
    const rows = await query(
      `SELECT ${COLS} FROM partners WHERE id = ? ${withDeleted ? '' : 'AND is_deleted = 0'} LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByGst(gst) {
    const rows = await query('SELECT id, name FROM partners WHERE gst = ? LIMIT 1', [gst]);
    return rows[0] || null;
  },

  async create(d) {
    const r = await query(
      `INSERT INTO partners
         (name, partner_type, pan, gst, corp_city, corp_state, corp_address, venue_address, website, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.name, d.partner_type || 'both', d.pan || null, d.gst || null,
        d.corp_city || null, d.corp_state || null, d.corp_address || null,
        d.venue_address || null, d.website || null, d.notes || null,
      ]
    );
    return PartnerModel.findById(r.insertId);
  },

  async update(id, d) {
    const FIELDS = ['name', 'partner_type', 'pan', 'gst', 'corp_city', 'corp_state',
      'corp_address', 'venue_address', 'website', 'notes'];
    const sets = [];
    const params = [];
    for (const f of FIELDS) {
      if (d[f] !== undefined) { sets.push(`${f} = ?`); params.push(d[f] === '' ? null : d[f]); }
    }
    if (!sets.length) return PartnerModel.findById(id);
    params.push(id);
    await query(`UPDATE partners SET ${sets.join(', ')} WHERE id = ?`, params);
    return PartnerModel.findById(id);
  },

  async softDelete(id) {
    await query('UPDATE partners SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);
  },

  async restore(id) {
    await query('UPDATE partners SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);
    return PartnerModel.findById(id);
  },

  // ---- contacts -----------------------------------------------------------

  listContacts(partnerId) {
    return query(
      `SELECT id, partner_id, name, designation, phone, email, is_primary
         FROM partner_contacts WHERE partner_id = ?
        ORDER BY is_primary DESC, name ASC`,
      [partnerId]
    );
  },

  async findContact(id) {
    const rows = await query('SELECT * FROM partner_contacts WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async addContact(partnerId, c) {
    // Exactly one primary contact per partner — promoting one demotes the rest.
    if (c.is_primary) await PartnerModel.clearPrimary(partnerId);
    const r = await query(
      `INSERT INTO partner_contacts (partner_id, name, designation, phone, email, is_primary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [partnerId, c.name, c.designation || null, c.phone || null, c.email || null, c.is_primary ? 1 : 0]
    );
    return PartnerModel.findContact(r.insertId);
  },

  async updateContact(id, partnerId, c) {
    if (c.is_primary) await PartnerModel.clearPrimary(partnerId);
    const FIELDS = ['name', 'designation', 'phone', 'email', 'is_primary'];
    const sets = [];
    const params = [];
    for (const f of FIELDS) {
      if (c[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(f === 'is_primary' ? (c[f] ? 1 : 0) : (c[f] === '' ? null : c[f]));
      }
    }
    if (!sets.length) return PartnerModel.findContact(id);
    params.push(id);
    await query(`UPDATE partner_contacts SET ${sets.join(', ')} WHERE id = ?`, params);
    return PartnerModel.findContact(id);
  },

  clearPrimary(partnerId) {
    return query('UPDATE partner_contacts SET is_primary = 0 WHERE partner_id = ?', [partnerId]);
  },

  deleteContact(id) {
    return query('DELETE FROM partner_contacts WHERE id = ?', [id]);
  },
};

module.exports = PartnerModel;

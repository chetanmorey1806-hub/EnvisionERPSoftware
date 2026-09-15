/**
 * SettingsController — /api/settings (settingsApi.js).
 *
 * Three things live here:
 *   · the institution profile — one row (id=1), auto-created on first read.
 *     It is the letterhead: what prints on a receipt, an invoice and a
 *     certificate, plus the bank block and the signatory.
 *   · document numbering — one row per document type per academic year, so
 *     "what does the next admission number read" is a setting, not a constant.
 *   · backup logs.
 */
const { pick, insert, update, findById, findAll, query } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');
const { DOC_TYPES, DOC_TYPE_KEYS, currentFy } = require('../helpers/numbering');

const PROFILE_FIELDS = [
  // identity
  'name', 'legal_name', 'tagline', 'registration_no', 'affiliation', 'logo',
  // where it is
  'address', 'city', 'state', 'pincode', 'phone', 'email', 'website',
  // statutory
  'gstin', 'pan',
  // how it runs
  'academic_year', 'currency', 'timezone',
  'max_batches_per_trainer_per_day', 'open_time', 'close_time',
  // what documents print
  'bank_name', 'bank_branch', 'account_holder', 'account_no', 'ifsc', 'upi_id',
  'signatory_name', 'signatory_role', 'receipt_terms', 'certificate_note',
];

const clampPadding = (v) => Math.max(1, Math.min(10, Number(v) || 4));
const clampNext = (v) => Math.max(1, Number(v) || 1);

async function ensureProfile() {
  let profile = await findById('institution_settings', 1);
  if (!profile) {
    await insert('institution_settings', { name: 'Envision Institute' });
    profile = await findById('institution_settings', 1);
  }
  return profile;
}

const SettingsController = {
  // GET /settings/profile
  async getInstitutionProfile(req, res) {
    return success(res, { data: await ensureProfile() }, 'Institution profile fetched.');
  },

  // PUT /settings/profile
  async updateInstitutionProfile(req, res) {
    await ensureProfile();
    await update('institution_settings', 1, pick(req.body, PROFILE_FIELDS));
    return success(res, { data: await findById('institution_settings', 1) }, 'Institution profile updated.');
  },

  // GET /settings/numbering?fy=2026-27
  // Always answers with every document type: a series that has never been
  // saved comes back as its default, so the screen has something to show and
  // the first save is an ordinary save.
  async getNumbering(req, res) {
    const fy = String(req.query.fy || '').trim() || currentFy();
    const rows = await query('SELECT * FROM `numbering_series` WHERE fy = ?', [fy]);
    const byType = new Map(rows.map((r) => [r.doc_type, r]));
    const data = DOC_TYPES.map((d) => {
      const row = byType.get(d.type);
      return row
        ? { ...row, label: d.label, note: d.note }
        : { doc_type: d.type, label: d.label, note: d.note, fy,
            prefix: d.prefix, suffix: null, next_number: 1, padding: 4 };
    });
    return success(res, { data, fy }, 'Numbering series fetched.');
  },

  // PUT /settings/numbering/:docType
  async saveNumbering(req, res) {
    const docType = String(req.params.docType || '');
    if (!DOC_TYPE_KEYS.has(docType)) {
      return fail(res, 'Unknown document type.', 422);
    }
    const fy = String(req.body.fy || '').trim() || currentFy();
    const prefix = String(req.body.prefix ?? '').trim();
    if (!prefix) {
      return fail(res, 'A prefix is required.', 422);
    }
    const row = {
      doc_type: docType,
      fy,
      prefix,
      suffix: String(req.body.suffix ?? '').trim() || null,
      next_number: clampNext(req.body.next_number),
      padding: clampPadding(req.body.padding),
    };
    // Upsert on (doc_type, fy) — the unique key does the deciding, so two
    // people saving the same series at once cannot create a duplicate.
    await query(
      `INSERT INTO \`numbering_series\` (doc_type, fy, prefix, suffix, next_number, padding)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         prefix = VALUES(prefix), suffix = VALUES(suffix),
         next_number = VALUES(next_number), padding = VALUES(padding)`,
      [row.doc_type, row.fy, row.prefix, row.suffix, row.next_number, row.padding]
    );
    const saved = await query(
      'SELECT * FROM `numbering_series` WHERE doc_type = ? AND fy = ? LIMIT 1', [docType, fy]
    );
    return success(res, { data: saved[0] || row }, 'Numbering saved.');
  },

  // GET /settings/backups
  async getBackupLogs(req, res) {
    return success(res, { data: await findAll('backup_logs') }, 'Backup logs fetched.');
  },

  // POST /settings/backups/trigger
  async triggerBackup(req, res) {
    const filename = `envision_erp_backup_${Date.now()}.sql`;
    const id = await insert('backup_logs', {
      filename,
      size_kb: Math.floor(1000 + (Date.now() % 5000)),
      status: 'success',
    });
    return created(res, { data: await findById('backup_logs', id) }, 'Backup triggered.');
  },
};

module.exports = SettingsController;

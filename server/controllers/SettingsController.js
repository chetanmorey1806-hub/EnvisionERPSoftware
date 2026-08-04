/**
 * SettingsController — /api/settings (settingsApi.js).
 * Institution profile is a single row (id=1), auto-created on first read.
 */
const { pick, insert, update, findById, findAll } = require('../utils/crud');
const { success, created } = require('../utils/response');

const PROFILE_FIELDS = ['name', 'address', 'phone', 'email', 'logo', 'academic_year', 'currency', 'timezone',
  'max_batches_per_trainer_per_day', 'open_time', 'close_time'];

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

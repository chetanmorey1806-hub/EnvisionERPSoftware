import api from './axios';

export const settingsApi = {
  getInstitutionProfile: () => api.get('/settings/profile'),
  updateInstitutionProfile: (data) => api.put('/settings/profile', data),
  getBackupLogs: () => api.get('/settings/backups'),
  triggerBackup: () => api.post('/settings/backups/trigger')
};
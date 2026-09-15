import api from './axios';

export const settingsApi = {
  getInstitutionProfile: () => api.get('/settings/profile'),
  updateInstitutionProfile: (data) => api.put('/settings/profile', data),

  // Document numbering — what the next admission / receipt / certificate reads.
  getNumbering: (fy) => api.get('/settings/numbering', { params: fy ? { fy } : {} }),
  saveNumbering: (docType, data) => api.put(`/settings/numbering/${docType}`, data),

  getBackupLogs: () => api.get('/settings/backups'),
  triggerBackup: () => api.post('/settings/backups/trigger')
};

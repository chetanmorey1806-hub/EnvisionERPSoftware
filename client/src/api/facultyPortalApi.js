import api from './axios';

export const facultyPortalApi = {
  me: () => api.get('/faculty/me'),
  schedule: (date) => api.get('/faculty/me/schedule', { params: { date } }),
  batches: () => api.get('/faculty/me/batches'),
  roster: (batchId, date) => api.get(`/faculty/me/roster/${batchId}`, { params: { date } }),

  logTopics: (data) => api.post('/faculty/me/class-log', data),
  classLogs: (batchId) => api.get('/faculty/me/class-logs', { params: { batchId } }),

  materials: (batchId) => api.get('/faculty/me/materials', { params: { batchId } }),
  uploadMaterial: (formData) =>
    api.post('/faculty/me/materials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};


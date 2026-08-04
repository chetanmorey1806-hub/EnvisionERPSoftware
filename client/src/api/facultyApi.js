import api from './axios';

export const facultyApi = {
  getAll: () => api.get('/faculty'),
  getById: (id) => api.get(`/faculty/${id}`),
  create: (data) => api.post('/faculty', data),
  update: (id, data) => api.put(`/faculty/${id}`, data),
  assignSchedule: (id, scheduleData) => api.post(`/faculty/${id}/schedule`, scheduleData)
};
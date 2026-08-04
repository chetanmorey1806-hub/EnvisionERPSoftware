import api from './axios';

export const courseApi = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  /** Course + first batch (dates, timings, trainer, room) + syllabus, atomically. */
  createFull: (data) => api.post('/courses/full', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
};

export const roomApi = {
  getAll: (type) => api.get('/rooms', { params: { type } }),
  create: (data) => api.post('/rooms', data),
};

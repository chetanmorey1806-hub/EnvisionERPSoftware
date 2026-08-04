import api from './axios';

export const batchApi = {
  getAll: (params) => api.get('/batches', { params }),
  getById: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  assignFaculty: (id, facultyId) => api.post(`/batches/${id}/assign-faculty`, { facultyId })
};
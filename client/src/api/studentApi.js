import api from './axios';

export const studentApi = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  uploadProfileImage: (id, formData) => api.post(`/students/${id}/upload-avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};
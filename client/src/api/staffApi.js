import api from './axios';

export const staffApi = {
  getAll: () => api.get('/staff'),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  updatePermissions: (id, permissions) => api.patch(`/staff/${id}/permissions`, { permissions })
};
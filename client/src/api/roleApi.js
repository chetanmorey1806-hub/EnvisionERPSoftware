import api from './axios';

export const roleApi = {
  getAll: () => api.get('/roles'),
  getPermissions: () => api.get('/roles/permissions'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  setPermissions: (id, permissions) => api.put(`/roles/${id}/permissions`, { permissions }),
  delete: (id) => api.delete(`/roles/${id}`),
};

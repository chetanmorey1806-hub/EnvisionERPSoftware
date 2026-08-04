import api from './axios';

export const userApi = {
  getAll: () => api.get('/users'),
  getRoles: () => api.get('/users/roles'),
  getById: (id) => api.get(`/users/${id}`),
  getPermissions: (id) => api.get(`/users/${id}/permissions`),

  create: (d) => api.post('/users', d),
  update: (id, d) => api.put(`/users/${id}`, d),

  setPassword: (id, password) => api.patch(`/users/${id}/password`, { password }),
  setLoginEnabled: (id, enabled) => api.patch(`/users/${id}/login`, { enabled }),

  delete: (id) => api.delete(`/users/${id}`),
};

export default userApi;

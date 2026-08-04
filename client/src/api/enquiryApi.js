import api from './axios';

export const enquiryApi = {
  getAll: (params) => api.get('/enquiries', { params }),
  getStats: () => api.get('/enquiries/stats'),
  getById: (id) => api.get(`/enquiries/${id}`),
  create: (data) => api.post('/enquiries', data),
  update: (id, data) => api.put(`/enquiries/${id}`, data),
  setTemperature: (id, temperature) => api.patch(`/enquiries/${id}/temperature`, { temperature }),
  setStatus: (id, status) => api.patch(`/enquiries/${id}/status`, { status }),
  scheduleCallback: (id, data) => api.post(`/enquiries/${id}/callback`, data),
  convert: (id, data = {}) => api.post(`/enquiries/${id}/convert`, data),
};

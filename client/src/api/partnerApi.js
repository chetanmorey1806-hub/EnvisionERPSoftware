import api from './axios';

/** Corporate partners — companies that sponsor training and hire our students. */
export const partnerApi = {
  getAll: (params) => api.get('/partners', { params }),
  getById: (id) => api.get(`/partners/${id}`),
  create: (data) => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  delete: (id) => api.delete(`/partners/${id}`),
  restore: (id) => api.post(`/partners/${id}/restore`),

  contacts: (id) => api.get(`/partners/${id}/contacts`),
  addContact: (id, data) => api.post(`/partners/${id}/contacts`, data),
  updateContact: (id, contactId, data) => api.put(`/partners/${id}/contacts/${contactId}`, data),
  deleteContact: (id, contactId) => api.delete(`/partners/${id}/contacts/${contactId}`),
};

export default partnerApi;

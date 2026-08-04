import api from './axios';

export const shareApi = {
  email: (data) => api.post('/share/email', data),
  contacts: (role) => api.get('/share/contacts', { params: { role } }),
};

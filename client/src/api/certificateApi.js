import api from './axios';

export const certificateApi = {
  getAll: () => api.get('/certificates'),
  getAllTemplates: () => api.get('/certificates/templates'),
  eligibility: (studentId) => api.get(`/certificates/eligibility/${studentId}`),
  issue: (d) => api.post('/certificates/issue', d),
  revoke: (id, reason) => api.patch(`/certificates/${id}/revoke`, { reason }),
  verify: (certificateNumber) => api.get(`/certificates/verify/${certificateNumber}`),
};

export default certificateApi;

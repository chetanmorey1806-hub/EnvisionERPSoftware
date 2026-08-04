import api from './axios';

export const admissionApi = {
  getApplications: (params) => api.get('/admissions', { params }),
  getDetails: (id) => api.get(`/admissions/${id}`),
  submitForm: (formData) => api.post('/admissions', formData),
  updateStatus: (id, statusData) => api.patch(`/admissions/${id}/status`, statusData),
  verifyDocuments: (id) => api.post(`/admissions/${id}/verify-docs`)
};
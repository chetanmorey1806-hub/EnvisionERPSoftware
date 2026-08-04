import api from './axios';

export const followupApi = {
  getByEnquiryId: (enquiryId) => api.get(`/followups/enquiry/${enquiryId}`),
  create: (data) => api.post('/followups', data),
  getPendingLogs: () => api.get('/followups/pending')
};
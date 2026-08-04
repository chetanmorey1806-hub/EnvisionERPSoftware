import api from './axios';

export const reportApi = {
  getFinancialSummary: (range) => api.get('/reports/finance', { params: { range } }),
  getEnrollmentTrends: () => api.get('/reports/enrollment'),
  exportData: (type, format) => api.get(`/reports/export/${type}`, { params: { format }, responseType: 'blob' })
};
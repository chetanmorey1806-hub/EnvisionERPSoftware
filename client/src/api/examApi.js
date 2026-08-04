import api from './axios';

export const examApi = {
  getAll: (params) => api.get('/exams', { params }),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  getHallTicket: (examId, studentId) => api.get(`/exams/${examId}/hall-ticket/${studentId}`)
};
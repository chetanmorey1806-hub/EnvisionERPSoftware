import api from './axios';

export const resultApi = {
  getBatchResults: (batchId, examId) => api.get(`/results/batch/${batchId}/exam/${examId}`),
  uploadMarks: (marksData) => api.post('/results/upload', marksData),
  getStudentReportCard: (studentId) => api.get(`/results/student/${studentId}`)
};
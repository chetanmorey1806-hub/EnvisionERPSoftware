import api from './axios';

export const attendanceApi = {
  // Register (view for admins, mark for the batch's trainer)
  getRegister: (batchId, date) => api.get('/attendance', { params: { batchId, date } }),
  submitBulk: (attendanceData) => api.post('/attendance/bulk', attendanceData),
  getStudentReport: (studentId) => api.get(`/attendance/student/${studentId}`),

  // Trainer-controlled in-class check-in window
  openSession: (batchId, date) => api.post('/attendance/session/open', { batchId, date }),
  closeSession: (batchId, date) => api.post('/attendance/session/close', { batchId, date }),

  // Student self check-in (needs the live code shown in class)
  myStatus: () => api.get('/students/me/attendance'),
  checkIn: (code) => api.post('/students/me/attendance/checkin', { code }),
};

export default attendanceApi;

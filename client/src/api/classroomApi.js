import api from './axios';

export const classroomApi = {
  // trainer / admin
  list: (params) => api.get('/classroom', { params }),
  publish: (formData) =>
    api.post('/classroom', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/classroom/${id}`),

  // trainer / admin: submissions
  submissions: (materialId) => api.get(`/classroom/${materialId}/submissions`),
  grade: (submissionId, data) => api.patch(`/classroom/submissions/${submissionId}`, data),

  // student (self-scoped)
  mine: (params) => api.get('/students/me/classroom', { params }),
  mySubmissions: () => api.get('/students/me/submissions'),
  submit: (materialId, formData) =>
    api.post(`/students/me/classroom/${materialId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

import api from './axios';

/** Google Classroom-style classes — see server/routes/class.routes.js. */
const form = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    fd.append(k, v);
  });
  return fd;
};
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const classApi = {
  list: (archived) => api.get('/classes', { params: archived ? { archived: 1 } : {} }),
  join: (code) => api.post('/classes/join', { code }),
  get: (id) => api.get(`/classes/${id}`),
  updateSettings: (id, data) => api.patch(`/classes/${id}`, data),
  resetCode: (id) => api.post(`/classes/${id}/code/reset`),

  stream: (id) => api.get(`/classes/${id}/stream`),
  announce: (id, { body, file }) => api.post(`/classes/${id}/announcements`, form({ body, documents: file }), multipart),
  removeAnnouncement: (id, annId) => api.delete(`/classes/${id}/announcements/${annId}`),
  comment: (id, data) => api.post(`/classes/${id}/comments`, data),
  removeComment: (id, commentId) => api.delete(`/classes/${id}/comments/${commentId}`),

  createTopic: (id, name) => api.post(`/classes/${id}/topics`, { name }),
  renameTopic: (id, topicId, name) => api.patch(`/classes/${id}/topics/${topicId}`, { name }),
  removeTopic: (id, topicId) => api.delete(`/classes/${id}/topics/${topicId}`),

  classwork: (id) => api.get(`/classes/${id}/classwork`),
  createWork: (id, data) => api.post(`/classes/${id}/classwork`, form({ ...data, documents: data.file, file: undefined }), multipart),
  updateWork: (id, workId, data) => api.patch(`/classes/${id}/classwork/${workId}`, data),
  removeWork: (id, workId) => api.delete(`/classes/${id}/classwork/${workId}`),
  work: (id, workId) => api.get(`/classes/${id}/classwork/${workId}`),
  turnIn: (id, workId, { note, file }) => api.post(`/classes/${id}/classwork/${workId}/turn-in`, form({ note, file }), multipart),
  unsubmit: (id, workId) => api.post(`/classes/${id}/classwork/${workId}/unsubmit`),
  grade: (id, workId, studentId, data) => api.put(`/classes/${id}/classwork/${workId}/grades/${studentId}`, data),
  returnWork: (id, workId, studentIds) => api.post(`/classes/${id}/classwork/${workId}/return`, { student_ids: studentIds }),
  privateComments: (id, workId, studentId) =>
    api.get(`/classes/${id}/classwork/${workId}/private-comments`, { params: studentId ? { student_id: studentId } : {} }),
  addPrivateComment: (id, workId, body, studentId) =>
    api.post(`/classes/${id}/classwork/${workId}/private-comments`, { body, student_id: studentId }),

  people: (id) => api.get(`/classes/${id}/people`),
  removeStudent: (id, studentId) => api.delete(`/classes/${id}/people/${studentId}`),
  grades: (id) => api.get(`/classes/${id}/grades`),
};

export default classApi;

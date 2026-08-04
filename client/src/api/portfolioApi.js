import api from './axios';

/** The student's own evidence. Self-scoped — no id is ever sent. */
export const portfolioApi = {
  get: () => api.get('/students/me/portfolio'),
  update: (d) => api.put('/students/me/portfolio', d),
  addSkill: (d) => api.post('/students/me/portfolio/skills', d),
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/students/me/portfolio/resume', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default portfolioApi;

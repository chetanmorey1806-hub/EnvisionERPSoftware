import api from './axios';

export const placementApi = {
  // Corporate CRM
  getJobs: () => api.get('/placements/jobs'),
  postJob: (d) => api.post('/placements/jobs', d),
  updateJob: (id, d) => api.put(`/placements/jobs/${id}`, d),
  getJobSkills: (id) => api.get(`/placements/jobs/${id}/skills`),

  // Matching
  matchCandidates: (jobId) => api.get('/placements/match-candidates', { params: { job_id: jobId } }),
  getPool: () => api.get('/placements/pool'),
  getSkillGaps: () => api.get('/placements/skill-gaps'),

  // Pipeline
  getPipeline: (jobId) => api.get(`/placements/jobs/${jobId}/pipeline`),
  shortlist: (d) => api.post('/placements/shortlist', d),
  advance: (id, status, reason) => api.patch(`/placements/applications/${id}`, { status, reason }),

  // Feedback loop
  logInterview: (id, d) => api.post(`/placements/applications/${id}/interview`, d),
  getInterviews: (id) => api.get(`/placements/applications/${id}/interviews`),

  getStats: () => api.get('/placements/metrics'),
  applyStudent: (d) => api.post('/placements/apply', d),
};

export default placementApi;

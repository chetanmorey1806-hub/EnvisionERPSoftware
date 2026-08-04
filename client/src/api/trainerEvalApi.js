import api from './axios';

/** The trainer half of the TSP loop: benchmark, sign off, remediate. */
export const trainerEvalApi = {
  getSkills: () => api.get('/trainer/skills'),
  createSkill: (d) => api.post('/trainer/skills', d),

  evaluateStudent: (d) => api.post('/trainer/evaluate-student', d),
  rateSoftSkills: (d) => api.post('/trainer/soft-skills', d),
  setSoftSkillClearance: (studentId, d) => api.patch(`/trainer/soft-skill-clearance/${studentId}`, d),

  readiness: (studentId) => api.get(`/trainer/readiness/${studentId}`),
  batchReadiness: (batchId) => api.get(`/trainer/readiness/batch/${batchId}`),

  getRemedialTasks: () => api.get('/trainer/remedial-tasks'),
  createRemedialTask: (d) => api.post('/trainer/remedial-tasks', d),
  updateRemedialTask: (id, status) => api.patch(`/trainer/remedial-tasks/${id}`, { status }),

  overrideEmployability: (studentId, status, reason) =>
    api.patch(`/trainer/employability/${studentId}`, { status, reason }),
};

export default trainerEvalApi;

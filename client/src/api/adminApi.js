import api from './axios';

export const adminApi = {
  summary: () => api.get('/admin/summary'),
  financials: () => api.get('/admin/financials'),
  setSalary: (facultyId, data) => api.patch(`/admin/trainers/${facultyId}/salary`, data),

  // Anonymous feedback (never exposes student identity)
  trainerFeedback: (cycle) => api.get('/admin/feedback/trainers', { params: { cycle } }),
  trainerComments: (facultyId) => api.get(`/admin/feedback/trainers/${facultyId}/comments`),

  // Communication triggers
  feeReminders: () => api.post('/admin/emails/fee-reminders'),
  attendanceWarnings: () => api.post('/admin/emails/attendance-warnings'),
  lowFeedbackAlerts: () => api.post('/admin/emails/low-feedback-alerts'),
  broadcast: (data) => api.post('/admin/emails/broadcast', data),
  escalation: (data) => api.post('/admin/emails/escalation', data),
  runDaily: () => api.post('/admin/emails/run-daily'),
  emailLogs: (params) => api.get('/admin/emails/logs', { params }),

  // Critical AI additions
  escalations: () => api.get('/admin/feedback/escalations'),
  retentionRisks: () => api.get('/admin/retention/risks'),
  recomputeRisk: () => api.post('/admin/retention/recompute'),
  transferBatch: (studentId, data) => api.post(`/admin/students/${studentId}/transfer`, data),

  // Leave approvals
  leaves: () => api.get('/admin/leaves'),
  decideLeave: (id, data) => api.patch(`/admin/leaves/${id}`, data),
};

export const feedbackApi = {
  pending: () => api.get('/students/me/feedback/pending'),
  submit: (data) => api.post('/students/me/feedback', data),
};

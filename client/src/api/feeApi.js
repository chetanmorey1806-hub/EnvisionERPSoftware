import api from './axios';

export const feeApi = {
  // Ledger
  getStudentStructure: (studentId) => api.get(`/fees/student/${studentId}`),
  getTransactions: (params) => api.get('/fees/transactions', { params }),
  generateReceipt: (txId) => api.get(`/fees/receipt/${txId}`, { responseType: 'blob' }),

  // Plans — what a course costs
  getPlans: () => api.get('/fees/plans'),
  createPlan: (d) => api.post('/fees/plans', d),
  updatePlan: (id, d) => api.put(`/fees/plans/${id}`, d),
  previewPlan: (d) => api.post('/fees/plans/preview', d),
  assignPlan: (d) => api.post('/fees/assign', d),

  // Money in
  getPendingDues: () => api.get('/fees/pending'),
  collectPayment: (d) => api.post('/fees/collect', d),
  sweep: () => api.post('/fees/sweep'),
  waiveFine: (id, reason) => api.patch(`/fees/fines/${id}/waive`, { reason }),

  // Money out
  getExpenses: (params) => api.get('/fees/expenses', { params }),
  createExpense: (d) => api.post('/fees/expenses', d),
  deleteExpense: (id) => api.delete(`/fees/expenses/${id}`),
  getProfitAndLoss: (params) => api.get('/fees/pnl', { params }),
};

export default feeApi;

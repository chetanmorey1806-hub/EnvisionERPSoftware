import api from './axios';

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
  getActivity: () => api.get('/dashboard/activity'),
};

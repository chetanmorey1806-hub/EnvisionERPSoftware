import api from './axios';

export const chatApi = {
  directory: () => api.get('/chat/directory'),
  rooms: () => api.get('/chat/rooms'),
  open: (userId) => api.post('/chat/rooms', { user_id: userId }),
  history: (roomId, before) => api.get(`/chat/rooms/${roomId}/messages`, { params: { before } }),
  send: (roomId, body) => api.post(`/chat/rooms/${roomId}/messages`, { body }),
  markRead: (roomId) => api.patch(`/chat/rooms/${roomId}/read`),
  edit: (id, body) => api.patch(`/chat/messages/${id}`, { body }),
  unread: () => api.get('/chat/unread'),
};

export default chatApi;

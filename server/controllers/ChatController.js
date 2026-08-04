/**
 * ChatController — /api/chat.
 *
 * REST mirrors the socket so the UI can render instantly on load (and still
 * work if the websocket is blocked); live delivery is the socket's job.
 */
const ChatService = require('../services/ChatService');
const { success, created } = require('../utils/response');

const ChatController = {
  // GET /chat/directory — who you may message
  async directory(req, res) {
    return success(res, { data: await ChatService.directory(req.user.id) }, 'Directory fetched.');
  },

  // GET /chat/rooms — your conversations, newest first
  async rooms(req, res) {
    return success(res, {
      data: { rooms: await ChatService.rooms(req.user.id), unread: await ChatService.totalUnread(req.user.id) },
    }, 'Conversations fetched.');
  },

  // POST /chat/rooms  { user_id }
  async open(req, res) {
    const room = await ChatService.openRoom(req.user.id, req.body?.user_id);
    return created(res, { data: room }, 'Conversation ready.');
  },

  // GET /chat/rooms/:id/messages?before=
  async history(req, res) {
    const data = await ChatService.history(req.params.id, req.user.id, req.query.before || null);
    return success(res, { data }, 'Messages fetched.');
  },

  // POST /chat/rooms/:id/messages  { body }
  async send(req, res) {
    const msg = await ChatService.send(req.params.id, req.user.id, req.body?.body);
    return created(res, { data: msg }, 'Sent.');
  },

  // PATCH /chat/rooms/:id/read
  async markRead(req, res) {
    return success(res, { data: await ChatService.markRead(req.params.id, req.user.id) }, 'Marked read.');
  },

  // PATCH /chat/messages/:id
  async edit(req, res) {
    return success(res, { data: await ChatService.edit(req.params.id, req.user.id, req.body?.body) }, 'Message edited.');
  },

  // GET /chat/unread
  async unread(req, res) {
    return success(res, { data: { count: await ChatService.totalUnread(req.user.id) } }, 'Unread fetched.');
  },
};

module.exports = ChatController;

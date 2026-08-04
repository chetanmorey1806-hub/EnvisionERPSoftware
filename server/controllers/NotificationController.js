/**
 * NotificationController — REST access to the current user's notifications
 * (the live push happens over Socket.IO; this is for initial load + read state).
 */
const NotificationModel = require('../models/NotificationModel');
const { presence } = require('../config/socket');
const { success, fail } = require('../utils/response');

const NotificationController = {
  // GET /notifications
  async list(req, res) {
    const [items, unread] = await Promise.all([
      NotificationModel.listForUser(req.user.id),
      NotificationModel.unreadCount(req.user.id),
    ]);
    return success(res, { data: items, unread }, 'Notifications fetched.');
  },

  // GET /notifications/unread-count
  async unreadCount(req, res) {
    const unread = await NotificationModel.unreadCount(req.user.id);
    return success(res, { unread }, 'Unread count fetched.');
  },

  // PATCH /notifications/:id/read
  async markRead(req, res) {
    const affected = await NotificationModel.markRead(req.params.id, req.user.id);
    if (!affected) return fail(res, 'Notification not found.', 404);
    return success(res, {}, 'Notification marked as read.');
  },

  // PATCH /notifications/read-all
  async markAllRead(req, res) {
    const count = await NotificationModel.markAllRead(req.user.id);
    return success(res, { updated: count }, 'All notifications marked as read.');
  },

  // GET /notifications/presence  (who is online right now)
  async presence(req, res) {
    return success(res, { data: presence() }, 'Presence fetched.');
  },
};

module.exports = NotificationController;

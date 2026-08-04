/**
 * NotificationService — persist a notification AND push it in real time.
 *
 * Every method returns a promise but is safe to fire-and-forget from domain
 * code (e.g. `NotificationService.notifyAdmins({...}).catch(() => {})`) so a
 * notification failure never breaks the underlying business action.
 */
const NotificationModel = require('../models/NotificationModel');
const socket = require('../config/socket');
const logger = require('../logs/logger');

async function persistAndEmit(userId, data) {
  const notification = await NotificationModel.create({ user_id: userId, ...data });
  socket.emitToUser(userId, 'notification:new', notification);
  return notification;
}

const NotificationService = {
  /** One specific user. */
  notifyUser(userId, data) {
    return persistAndEmit(userId, data).catch((err) => {
      logger.error(`[notify] user ${userId} failed: ${err.message}`);
    });
  },

  /** Every active user in the given roles (each gets an independent row). */
  async notifyRoles(roles, data) {
    try {
      const ids = await NotificationModel.userIdsByRoles(roles);
      await Promise.all(ids.map((id) => persistAndEmit(id, data)));
      return ids.length;
    } catch (err) {
      logger.error(`[notify] roles ${roles.join(',')} failed: ${err.message}`);
      return 0;
    }
  },

  /** Convenience: notify all admins + super admins. */
  notifyAdmins(data) {
    return this.notifyRoles(['admin', 'super_admin'], data);
  },
};

module.exports = NotificationService;

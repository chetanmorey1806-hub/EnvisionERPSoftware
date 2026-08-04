/**
 * Socket.IO real-time layer.
 *
 * - Authenticates every connection with the JWT access token (same secret as
 *   the REST API) passed via `handshake.auth.token`.
 * - Puts each socket into two rooms: `user:<id>` and `role:<role>`, so the
 *   server can target a specific user or a whole role.
 * - Tracks online users for presence and broadcasts `presence:update`.
 *
 * Emit helpers are used by services (e.g. NotificationService) to push events.
 */
const { Server } = require('socket.io');
const { verifyAccessToken } = require('./jwt');
const logger = require('../logs/logger');

let io = null;
const online = new Map(); // userId -> Set(socketId)

function addOnline(userId, socketId) {
  if (!online.has(userId)) online.set(userId, new Set());
  online.get(userId).add(socketId);
}

function removeOnline(userId, socketId) {
  const set = online.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) online.delete(userId);
}

function presence() {
  return { onlineUsers: online.size, userIds: [...online.keys()] };
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Auth handshake
  io.use((socket, next) => {
    const raw =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace('Bearer ', '');
    if (!raw) return next(new Error('Authentication required.'));
    try {
      socket.user = verifyAccessToken(raw);
      return next();
    } catch {
      return next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    addOnline(id, socket.id);
    io.emit('presence:update', presence());
    logger.info(`[socket] user ${id} (${role}) connected — ${online.size} online`);

    // Chat lives on this same connection. Registered here (rather than in its
    // own gateway) so it inherits the JWT handshake and the presence map.
    registerChat(socket);

    socket.on('disconnect', () => {
      removeOnline(id, socket.id);
      io.emit('presence:update', presence());
      logger.info(`[socket] user ${id} disconnected — ${online.size} online`);
    });
  });

  return io;
}

/**
 * Chat socket handlers.
 *
 * Required lazily: ChatService requires this module back (for emit helpers), so
 * a top-level import here would be a circular require and `socket.emitToUser`
 * would be undefined at call time.
 */
function registerChat(socket) {
  const userId = socket.user.id;
  const ChatService = require('../services/ChatService');

  // Every handler is wrapped: a throw inside a socket listener is unhandled and
  // takes the process down. Errors go back to the caller instead.
  const on = (event, handler) => {
    socket.on(event, async (payload = {}) => {
      try {
        await handler(payload);
      } catch (err) {
        socket.emit('chat:error', { event, message: err.message || 'Chat failed.' });
      }
    });
  };

  on('chat:open', async ({ userId: targetId }) => {
    if (!(await ChatService.canChat(userId))) throw new Error('You do not have chat access.');
    const room = await ChatService.openRoom(userId, targetId);
    socket.join(`chat:${room.id}`);
    socket.emit('chat:ready', { room_id: room.id, user_id: Number(targetId) });
    socket.emit('chat:history', { room_id: room.id, ...(await ChatService.history(room.id, userId)) });
    await ChatService.markRead(room.id, userId);
  });

  on('chat:join', async ({ room_id }) => {
    await ChatService.assertMember(room_id, userId);
    socket.join(`chat:${room_id}`);
    await ChatService.markRead(room_id, userId);
  });

  // Leaving matters: it is what makes an incoming message count as unread
  // rather than silently already-read.
  on('chat:leave', async ({ room_id }) => { socket.leave(`chat:${room_id}`); });

  on('chat:history', async ({ room_id, before }) => {
    socket.emit('chat:history', {
      room_id: Number(room_id), before: before || null,
      ...(await ChatService.history(room_id, userId, before)),
    });
  });

  on('chat:send', async ({ room_id, body }) => { await ChatService.send(room_id, userId, body); });
  on('chat:edit', async ({ id, body }) => { await ChatService.edit(id, userId, body); });

  on('chat:rooms', async () => {
    socket.emit('chat:rooms', await ChatService.rooms(userId));
    socket.emit('chat:unread', await ChatService.totalUnread(userId));
  });
}

// ---- Emit helpers (no-op if the socket server isn't up yet) -----------------
function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}
function emitToRole(role, event, payload) {
  if (io) io.to(`role:${role}`).emit(event, payload);
}
function emitBroadcast(event, payload) {
  if (io) io.emit(event, payload);
}

module.exports = {
  initSocket,
  emitToUser,
  emitToRole,
  emitBroadcast,
  presence,
  getIO: () => io,
};

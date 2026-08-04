/**
 * ChatService — internal 1:1 messaging between employees and trainers.
 *
 * WHO CAN CHAT: anyone whose role holds `chat.view`. That is deliberately
 * data-driven rather than a hardcoded role list — students don't hold it today,
 * so they are simply absent from the directory and cannot be messaged. Grant
 * them the permission later and they appear, with no code change.
 *
 * THE PAIR INVARIANT: a room stores the smaller user id in `user_a`. So "the
 * room for me and you" is one lookup on a unique key, and a duplicate room is
 * impossible rather than merely unlikely.
 *
 * READ STATE is derived from `read_at IS NULL`, never a stored counter. A
 * counter is a second source of truth, and it drifts the first time an update
 * is missed.
 *
 * DELIVERY vs READ — the distinction users actually care about:
 *   sent      · it's in the database                    (one tick)
 *   delivered · they were connected when it landed      (two grey ticks)
 *   read      · they had this very thread open          (two blue ticks)
 * Both stamps are computed BEFORE the insert, so a message is written once and
 * arrives already carrying its true state — no follow-up UPDATE, no flicker.
 */
const { query } = require('../config/db');
const socket = require('../config/socket');

const EDIT_WINDOW_MS = Number(process.env.CHAT_EDIT_WINDOW_MIN || 15) * 60 * 1000;
const PAGE = 40;

const httpError = (message, status) => Object.assign(new Error(message), { status });

/** Ordered pair — the invariant the unique key depends on. */
const pair = (a, b) => (Number(a) < Number(b) ? [Number(a), Number(b)] : [Number(b), Number(a)]);

const ChatService = {
  EDIT_WINDOW_MS,

  /** Is this user allowed to chat at all? (drives the directory + every guard) */
  async canChat(userId) {
    const [row] = await query(
      `SELECT 1 AS ok FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p       ON p.id = rp.permission_id
       WHERE u.id = ? AND p.name = 'chat.view'
         AND u.status = 'active' AND u.login_enabled = 1
       LIMIT 1`,
      [userId]
    );
    return Boolean(row);
  },

  /**
   * The people you may message: every active account whose role holds
   * `chat.view`, minus yourself. Students are excluded by not holding it.
   * Returns unread-per-person so the list can sort by "who is waiting on me".
   */
  async directory(userId) {
    return query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar, r.label AS role_label,
              cr.id AS room_id,
              COALESCE((SELECT COUNT(*) FROM chat_messages m
                         WHERE m.room_id = cr.id AND m.sender_id = u.id AND m.read_at IS NULL), 0) AS unread,
              (SELECT m2.body FROM chat_messages m2
                WHERE m2.room_id = cr.id ORDER BY m2.id DESC LIMIT 1) AS last_message,
              cr.last_message_at
       FROM users u
       JOIN roles r             ON r.id = u.role_id
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p       ON p.id = rp.permission_id AND p.name = 'chat.view'
       LEFT JOIN chat_rooms cr
         ON cr.user_a = LEAST(u.id, ?) AND cr.user_b = GREATEST(u.id, ?)
       WHERE u.id <> ? AND u.status = 'active' AND u.login_enabled = 1
       GROUP BY u.id, u.name, u.email, u.role, u.avatar, r.label, cr.id, cr.last_message_at
       ORDER BY unread DESC, cr.last_message_at IS NULL, cr.last_message_at DESC, u.name ASC`,
      [userId, userId, userId]
    );
  },

  /**
   * Your conversations, newest first — with unread counts resolved in ONE
   * query. (The reference implementation ran a COUNT per room in a loop; at
   * 50 conversations that is 50 round-trips every time the list refreshes.)
   */
  async rooms(userId) {
    return query(
      `SELECT cr.id AS room_id, cr.last_message_at,
              other.id AS user_id, other.name, other.role, other.avatar,
              (SELECT m.body FROM chat_messages m WHERE m.room_id = cr.id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT m.sender_id FROM chat_messages m WHERE m.room_id = cr.id ORDER BY m.id DESC LIMIT 1) AS last_sender_id,
              COALESCE(unread.n, 0) AS unread
       FROM chat_rooms cr
       JOIN users other ON other.id = IF(cr.user_a = ?, cr.user_b, cr.user_a)
       LEFT JOIN (
         SELECT room_id, COUNT(*) AS n FROM chat_messages
         WHERE read_at IS NULL AND sender_id <> ?
         GROUP BY room_id
       ) unread ON unread.room_id = cr.id
       WHERE cr.user_a = ? OR cr.user_b = ?
       ORDER BY cr.last_message_at IS NULL, cr.last_message_at DESC`,
      [userId, userId, userId, userId]
    );
  },

  /** One number for the navbar badge. One query. */
  async totalUnread(userId) {
    const [row] = await query(
      `SELECT COUNT(*) AS n
       FROM chat_messages m
       JOIN chat_rooms cr ON cr.id = m.room_id
       WHERE m.read_at IS NULL AND m.sender_id <> ?
         AND (cr.user_a = ? OR cr.user_b = ?)`,
      [userId, userId, userId]
    );
    return Number(row.n);
  },

  /**
   * Find or create the room for two people — ATOMICALLY.
   * A plain SELECT-then-INSERT loses the race when both parties open the chat
   * at the same instant: both see nothing, both insert, one gets a duplicate-key
   * 500. `INSERT ... ON DUPLICATE KEY UPDATE` makes the unique index settle it.
   */
  async openRoom(userId, targetId) {
    if (Number(userId) === Number(targetId)) throw httpError('You cannot chat with yourself.', 422);

    if (!(await this.canChat(targetId))) {
      throw httpError('That person is not available for chat.', 403);
    }
    const [a, b] = pair(userId, targetId);

    await query(
      `INSERT INTO chat_rooms (user_a, user_b) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [a, b]
    );
    const [room] = await query('SELECT * FROM chat_rooms WHERE user_a = ? AND user_b = ?', [a, b]);
    return room;
  },

  /** Throws unless the user is one of the room's two members. */
  async assertMember(roomId, userId) {
    const [room] = await query(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1',
      [roomId, userId, userId]
    );
    if (!room) throw httpError('This conversation is not yours.', 403);
    return room;
  },

  otherOf(room, userId) {
    return Number(room.user_a) === Number(userId) ? Number(room.user_b) : Number(room.user_a);
  },

  /**
   * A page of history, oldest-first for rendering.
   * `before` is a message id — pass the oldest one you hold to page backwards.
   */
  async history(roomId, userId, before = null) {
    await this.assertMember(roomId, userId);
    const rows = await query(
      `SELECT m.*, u.name AS sender_name
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = ? ${before ? 'AND m.id < ?' : ''}
       ORDER BY m.id DESC LIMIT ${PAGE}`,
      before ? [roomId, before] : [roomId]
    );
    return {
      messages: rows.reverse(),                 // ascending for the UI
      has_more: rows.length === PAGE,           // so the client knows to offer "load older"
    };
  },

  /**
   * Stamp the other side's messages as read, and tell both parties.
   *
   * `read_at IS NULL` in the WHERE is what makes this safe to call from every
   * tab: without it a second tab would re-stamp rows that were already read and
   * clobber the original timestamp.
   */
  async markRead(roomId, userId) {
    const room = await this.assertMember(roomId, userId);
    const other = this.otherOf(room, userId);

    const unreadRows = await query(
      'SELECT id FROM chat_messages WHERE room_id = ? AND sender_id = ? AND read_at IS NULL',
      [roomId, other]
    );
    const ids = unreadRows.map((r) => r.id);
    const readAt = new Date();

    if (ids.length) {
      await query(
        `UPDATE chat_messages
         SET read_at = ?, delivered_at = COALESCE(delivered_at, ?)
         WHERE room_id = ? AND sender_id = ? AND read_at IS NULL`,
        [readAt, readAt, roomId, other]
      );
    }

    // The asymmetry here is deliberate and easy to get wrong:
    //  - the READER's own channel gets clearUnread, so every one of their tabs
    //    drops the badge (even when ids is empty — they opened an already-read
    //    thread and the badge must still go);
    //  - the SENDER's channel must NOT, because the sender may have their own
    //    genuine unread messages from this same person. Clearing there would
    //    wrongly zero their badge.
    socket.emitToUser(userId, 'chat:read', { room_id: Number(roomId), ids, read_at: readAt, clear_unread: true });
    if (ids.length) {
      socket.emitToUser(other, 'chat:read', { room_id: Number(roomId), ids, read_at: readAt });
    }
    socket.emitToUser(userId, 'chat:unread', await this.totalUnread(userId));
    return { ids, read_at: readAt };
  },

  /**
   * Send. Delivery/read state is computed BEFORE the write, from live presence:
   * if they're connected it's delivered; if they have this very thread open
   * it's already read.
   */
  async send(roomId, userId, body) {
    const text = String(body || '').trim();
    if (!text) throw httpError('Write something first.', 422);
    if (text.length > 4000) throw httpError('That message is too long (4000 characters max).', 422);

    const room = await this.assertMember(roomId, userId);
    const other = this.otherOf(room, userId);

    const io = socket.getIO();
    const onlineIds = socket.presence().userIds.map(Number);
    const recipientOnline = onlineIds.includes(other);

    // Are they actually looking at THIS conversation right now?
    let recipientInRoom = false;
    if (io && recipientOnline) {
      const sockets = await io.in(`user:${other}`).fetchSockets();
      recipientInRoom = sockets.some((s) => s.rooms.has(`chat:${roomId}`));
    }

    const now = new Date();
    const deliveredAt = recipientOnline ? now : null;
    const readAt = recipientInRoom ? now : null;

    const r = await query(
      'INSERT INTO chat_messages (room_id, sender_id, body, delivered_at, read_at) VALUES (?, ?, ?, ?, ?)',
      [roomId, userId, text, deliveredAt, readAt]
    );
    await query('UPDATE chat_rooms SET last_message_at = ? WHERE id = ?', [now, roomId]);

    const [msg] = await query(
      'SELECT m.*, u.name AS sender_name FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?',
      [r.insertId]
    );

    // Emit to the thread AND to both personal channels. A client may have the
    // conversation closed (so it isn't in the `chat:<id>` room) but still needs
    // the message for its list and badge. Clients dedupe by message id.
    if (io) io.to(`chat:${roomId}`).emit('chat:message', msg);
    socket.emitToUser(userId, 'chat:message', msg);
    socket.emitToUser(other, 'chat:message', msg);

    socket.emitToUser(userId, 'chat:sent', {
      id: msg.id, room_id: Number(roomId), delivered_at: deliveredAt, read_at: readAt, recipient_online: recipientOnline,
    });

    if (!recipientInRoom) {
      socket.emitToUser(other, 'chat:notify', {
        room_id: Number(roomId),
        sender_id: userId,
        sender_name: msg.sender_name,
        preview: text.slice(0, 80),
      });
      socket.emitToUser(other, 'chat:unread', await this.totalUnread(other));
    }
    return msg;
  },

  /** Edit your own message, briefly. Not a rewrite-history button. */
  async edit(msgId, userId, body) {
    const text = String(body || '').trim();
    if (!text) throw httpError('Write something first.', 422);

    const [msg] = await query('SELECT * FROM chat_messages WHERE id = ?', [msgId]);
    if (!msg) throw httpError('Message not found.', 404);
    if (Number(msg.sender_id) !== Number(userId)) throw httpError('You can only edit your own messages.', 403);
    if (Date.now() - new Date(msg.created_at).getTime() > EDIT_WINDOW_MS) {
      throw httpError(`Messages can only be edited within ${EDIT_WINDOW_MS / 60000} minutes of sending.`, 409);
    }
    await this.assertMember(msg.room_id, userId);

    await query('UPDATE chat_messages SET body = ?, edited_at = NOW() WHERE id = ?', [text, msgId]);
    const [updated] = await query(
      'SELECT m.*, u.name AS sender_name FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?',
      [msgId]
    );

    const room = await this.assertMember(msg.room_id, userId);
    const other = this.otherOf(room, userId);
    const io = socket.getIO();
    if (io) io.to(`chat:${msg.room_id}`).emit('chat:edited', updated);
    socket.emitToUser(userId, 'chat:edited', updated);
    socket.emitToUser(other, 'chat:edited', updated);
    return updated;
  },
};

module.exports = ChatService;

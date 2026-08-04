import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../common/icons';
import { chatApi } from '../../api/chatApi';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';

/**
 * ChatWidget — internal messaging between employees and trainers.
 *
 * A navbar icon + a people panel + up to three Messenger-style popups. Lives in
 * a portal so a conversation survives navigating between pages.
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 *  1. DEDUPE BY ID. The server emits each message to the thread AND to both
 *     people's personal channels (so a closed conversation still updates the
 *     list and badge). The same message therefore arrives more than once, and
 *     the client is what makes that harmless.
 *
 *  2. JOIN/LEAVE IS THE READ SIGNAL. Being joined to a thread is what marks
 *     incoming messages read. So an open, non-minimised window joins, and
 *     closing or minimising leaves — otherwise a minimised window would keep
 *     silently swallowing unread counts.
 */

const MAX_WINDOWS = 3;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const timeStr = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayKey = (d) => new Date(d).toDateString();
const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yest.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** sent → delivered → read, exactly like the ticks people already understand. */
const Tick = ({ msg }) => {
  const { t } = useT();
  const title = msg.read_at ? `${t('Read')} ${timeStr(msg.read_at)}`
    : msg.delivered_at ? `${t('Delivered')} ${timeStr(msg.delivered_at)}`
      : t('Sent');
  if (msg.read_at) return <span title={title} className="text-sky-300 font-bold">✓✓</span>;
  if (msg.delivered_at) return <span title={title} className="text-white/60 font-bold">✓✓</span>;
  return <span title={title} className="text-white/60 font-bold">✓</span>;
};

const Avatar = ({ name, online, size = 8 }) => (
  <span className="relative shrink-0">
    <span className={`h-${size} w-${size} rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 grid place-items-center text-[11px] font-black`}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
    {online && (
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
    )}
  </span>
);

/* ────────────────────────── one conversation window ────────────────────────── */

const ChatWindow = ({ chat, index, me, socket, onlineIds, onClose, onToggle, onPatch }) => {
  const { t } = useT();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(null);
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  const online = onlineIds.includes(Number(chat.user_id));
  const open = !chat.minimized && chat.room_id;

  // Joined == "I am reading this". Leave on minimise/close or unread stops counting.
  useEffect(() => {
    if (!socket || !chat.room_id) return undefined;
    if (open) socket.emit('chat:join', { room_id: chat.room_id });
    else socket.emit('chat:leave', { room_id: chat.room_id });
    return () => { socket.emit('chat:leave', { room_id: chat.room_id }); };
  }, [socket, chat.room_id, open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages?.length, open]);

  const send = () => {
    const body = draft.trim();
    if (!body || !chat.room_id) return;
    if (editing) {
      socket.emit('chat:edit', { id: editing, body });
      setEditing(null);
    } else {
      socket.emit('chat:send', { room_id: chat.room_id, body });
    }
    setDraft('');
  };

  const loadOlder = () => {
    const oldest = chat.messages?.[0];
    if (oldest) socket.emit('chat:history', { room_id: chat.room_id, before: oldest.id });
  };

  // Only the most recent own message is editable, and only briefly.
  const lastOwnEditable = useMemo(() => {
    const own = (chat.messages || []).filter((m) => Number(m.sender_id) === Number(me));
    const last = own[own.length - 1];
    if (!last) return null;
    return Date.now() - new Date(last.created_at).getTime() < EDIT_WINDOW_MS ? last.id : null;
  }, [chat.messages, me]);

  return (
    <div
      className="fixed bottom-0 z-9999 w-90 rounded-t-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col"
      style={{ right: 16 + index * 376, height: chat.minimized ? 48 : 460, maxHeight: '80vh' }}
    >
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-gray-100 dark:border-slate-800 cursor-pointer"
        onClick={() => onToggle(chat)}>
        <Avatar name={chat.name} online={online} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">{chat.name}</p>
          <p className="text-[10px] text-gray-400 truncate">
            {online ? t('Online') : t('Offline — they will see it later')}
          </p>
        </div>
        {chat.minimized && chat.unread > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{chat.unread}</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onClose(chat); }}
          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200" aria-label={t('Close')}>
          <Icons.close size={15} />
        </button>
      </div>

      {!chat.minimized && (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {chat.has_more && (
              <button onClick={loadOlder}
                className="w-full py-1.5 text-[10px] font-bold text-blue-600 hover:underline">
                {t('Load older messages')}
              </button>
            )}
            {!chat.room_id && <p className="text-[11px] text-gray-400 text-center py-4">{t('Connecting…')}</p>}
            {chat.room_id && (chat.messages || []).length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-6">{t('No messages yet. Say hello.')}</p>
            )}

            {(chat.messages || []).map((m, i) => {
              const mine = Number(m.sender_id) === Number(me);
              const prev = chat.messages[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              return (
                <React.Fragment key={m.id}>
                  {newDay && (
                    <div className="flex justify-center my-2">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[9px] font-bold text-gray-500">
                        {t(dayLabel(m.created_at))}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 rounded-bl-sm'
                    }`}>
                      <p className="text-xs whitespace-pre-wrap break-words">{m.body}</p>
                      <div className={`flex items-center gap-1 justify-end mt-0.5 text-[9px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                        {m.edited_at && <span className="italic">{t('edited')}</span>}
                        <span>{timeStr(m.created_at)}</span>
                        {mine && <Tick msg={m} />}
                        {mine && m.id === lastOwnEditable && (
                          <button onClick={() => { setEditing(m.id); setDraft(m.body); }}
                            className="ml-0.5 hover:text-white" title={t('Edit')}>
                            <Icons.edit size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-slate-800 shrink-0">
            {editing && (
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] font-bold text-amber-600">{t('Editing message')}</span>
                <button onClick={() => { setEditing(null); setDraft(''); }} className="text-[10px] text-gray-400">
                  {t('Cancel')}
                </button>
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('Write a message…')}
                disabled={!chat.room_id}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
              />
              <button onClick={send} disabled={!draft.trim() || !chat.room_id}
                className="px-3 rounded-full bg-blue-600 text-white disabled:opacity-40" aria-label={t('Send')}>
                <Icons.send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ────────────────────────────── the widget ────────────────────────────── */

const ChatWidget = () => {
  const { socket, onlineIds } = useSocket();
  const { user } = useContext(AuthContext);
  const { can } = usePermissions();
  const { t } = useT();

  const me = Number(user?.id);
  const [panel, setPanel] = useState(false);
  const [people, setPeople] = useState([]);
  const [chats, setChats] = useState([]);       // open windows
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  const enabled = can('chat.view');

  // ---- load the directory + badge
  const loadDirectory = async () => {
    try {
      const [d, u] = await Promise.all([chatApi.directory(), chatApi.unread()]);
      setPeople(d.data.data || []);
      setUnread(u.data.data?.count ?? 0);
    } catch { /* chat simply stays closed */ }
  };
  useEffect(() => { if (enabled) loadDirectory(); /* eslint-disable-next-line */ }, [enabled]);

  const patch = (roomOrUserId, updater, byUser = false) => {
    setChats((prev) => prev.map((c) => {
      const hit = byUser ? Number(c.user_id) === Number(roomOrUserId) : Number(c.room_id) === Number(roomOrUserId);
      return hit ? { ...c, ...updater(c) } : c;
    }));
  };

  // ---- socket wiring
  useEffect(() => {
    if (!socket || !enabled) return undefined;

    const onReady = ({ room_id, user_id }) => {
      // Back-fill the room id into the placeholder window opened optimistically.
      patch(user_id, () => ({ room_id }), true);
    };

    const onHistory = ({ room_id, before, messages, has_more }) => {
      patch(room_id, (c) => ({
        // Paging backwards prepends; a fresh open replaces.
        messages: before ? [...messages, ...(c.messages || [])] : messages,
        has_more,
      }));
    };

    const onMessage = (msg) => {
      const room = Number(msg.room_id);
      setChats((prev) => prev.map((c) => {
        if (Number(c.room_id) !== room) return c;
        // THE dedupe — the server emits this to up to three channels.
        if ((c.messages || []).some((m) => m.id === msg.id)) return c;
        const mine = Number(msg.sender_id) === me;
        return {
          ...c,
          messages: [...(c.messages || []), msg],
          unread: !mine && c.minimized ? (c.unread || 0) + 1 : c.unread,
        };
      }));
      loadDirectory();
    };

    const onSent = ({ id, room_id, delivered_at, read_at }) => {
      patch(room_id, (c) => ({
        messages: (c.messages || []).map((m) => (m.id === id ? { ...m, delivered_at, read_at } : m)),
      }));
    };

    const onRead = ({ room_id, ids, read_at, clear_unread }) => {
      patch(room_id, (c) => ({
        messages: (c.messages || []).map((m) => (ids.includes(m.id) ? { ...m, read_at, delivered_at: m.delivered_at || read_at } : m)),
        ...(clear_unread ? { unread: 0 } : {}),
      }));
      if (clear_unread) loadDirectory();
    };

    const onEdited = (msg) => {
      patch(msg.room_id, (c) => ({
        messages: (c.messages || []).map((m) => (m.id === msg.id ? msg : m)),
      }));
    };

    const onNotify = ({ sender_name, preview }) => {
      // Non-intrusive: the badge is the real signal. This is just a nudge.
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`💬 ${sender_name}`, { body: preview });
      }
    };

    socket.on('chat:ready', onReady);
    socket.on('chat:history', onHistory);
    socket.on('chat:message', onMessage);
    socket.on('chat:sent', onSent);
    socket.on('chat:read', onRead);
    socket.on('chat:edited', onEdited);
    socket.on('chat:notify', onNotify);
    socket.on('chat:unread', setUnread);
    socket.on('chat:error', (e) => console.warn('[chat]', e.message));

    return () => {
      ['chat:ready', 'chat:history', 'chat:message', 'chat:sent', 'chat:read',
        'chat:edited', 'chat:notify', 'chat:unread', 'chat:error'].forEach((e) => socket.off(e));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, enabled, me]);

  const openChat = (person) => {
    setPanel(false);
    const existing = chatsRef.current.find((c) => Number(c.user_id) === Number(person.id));
    if (existing) {
      patch(person.id, () => ({ minimized: false }), true);
      return;
    }
    // Optimistic window — renders "Connecting…" until chat:ready lands.
    setChats((prev) => {
      const trimmed = prev.length >= MAX_WINDOWS ? prev.slice(1) : prev;
      return [...trimmed, {
        user_id: person.id, name: person.name, room_id: person.room_id || null,
        messages: [], minimized: false, unread: 0, has_more: false,
      }];
    });
    socket?.emit('chat:open', { userId: person.id });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };

  const closeChat = (chat) => {
    if (chat.room_id) socket?.emit('chat:leave', { room_id: chat.room_id });
    setChats((prev) => prev.filter((c) => c.user_id !== chat.user_id));
  };
  const toggleChat = (chat) =>
    patch(chat.user_id, (c) => ({ minimized: !c.minimized, unread: c.minimized ? 0 : c.unread }), true);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.role_label || '').toLowerCase().includes(q));
  }, [people, search]);

  if (!enabled) return null;

  return (
    <>
      <button onClick={() => { setPanel((v) => !v); loadDirectory(); }}
        className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        aria-label={t('Chat')}>
        <Icons.chat size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-black">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {panel && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPanel(false)} />
          <div className="fixed top-16 right-4 z-50 w-72 max-h-[70vh] rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col">
            <div className="p-3 border-b border-gray-100 dark:border-slate-800">
              <p className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-2">{t('Chat')}</p>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search people…')}
                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {shown.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-6">{t('Nobody to chat with yet.')}</p>
              ) : shown.map((p) => (
                <button key={p.id} onClick={() => openChat(p)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-left">
                  <Avatar name={p.name} online={onlineIds.includes(Number(p.id))} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{p.name}</span>
                    <span className="block text-[10px] text-gray-400 truncate">
                      {p.last_message || p.role_label}
                    </span>
                  </span>
                  {Number(p.unread) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">{p.unread}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>, document.body)}

      {createPortal(
        <>
          {chats.map((c, i) => (
            <ChatWindow key={c.user_id} chat={c} index={i} me={me} socket={socket} onlineIds={onlineIds}
              onClose={closeChat} onToggle={toggleChat} onPatch={patch} />
          ))}
        </>, document.body)}
    </>
  );
};

export default ChatWidget;

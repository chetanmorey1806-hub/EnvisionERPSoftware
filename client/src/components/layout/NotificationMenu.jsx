import React, { useState, useRef, useEffect } from 'react';
import { useInbox } from '../../context/InboxContext';
import { useSocket } from '../../context/SocketContext';
import { Icons, notificationIcon } from '../common/icons';

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts.replace(' ', 'T')).getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};



const NotificationMenu = () => {
  const { items, unread, markRead, markAllRead } = useInbox();
  const { connected, online } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Icons.bell size={18} strokeWidth={2} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full animate-scale-up">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-up origin-top-right">
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700 dark:text-slate-200">Notifications</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  connected ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-gray-400 bg-gray-100 dark:bg-slate-800'
                }`}
                title={connected ? 'Live connection active' : 'Offline'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                {connected ? `Live · ${online} online` : 'Offline'}
              </span>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-blue-600 hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <Icons.bellOff size={26} strokeWidth={1.6} className="mx-auto mb-2 opacity-60" aria-hidden="true" />
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                    n.is_read ? '' : 'bg-blue-50/40 dark:bg-blue-900/10'
                  }`}
                >
                  {(() => {
                    const NIcon = notificationIcon[n.type] || Icons.bell;
                    return <NIcon size={16} strokeWidth={2} className="shrink-0 mt-0.5 text-gray-400" aria-hidden="true" />;
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs truncate ${n.is_read ? 'text-gray-600 dark:text-slate-400 font-medium' : 'text-gray-800 dark:text-slate-100 font-semibold'}`}>
                      {n.title}
                    </p>
                    {n.message && <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;

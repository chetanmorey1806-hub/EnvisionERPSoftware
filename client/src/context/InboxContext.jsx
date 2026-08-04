import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import { NotificationContext } from './NotificationContext';
import { notificationApi } from '../api/notificationApi';

export const InboxContext = createContext(null);

// Map a notification type to a toast style.
const toastType = (type) =>
  ({ fee: 'success', admission: 'info', enquiry: 'info', error: 'error', warning: 'warning' }[type] || 'info');

export const InboxProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { showToast } = useContext(NotificationContext);

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  // Initial load (and reset on logout).
  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnread(0);
      return;
    }
    notificationApi
      .getAll()
      .then((res) => {
        setItems(res.data?.data || []);
        setUnread(res.data?.unread || 0);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Live updates over the socket.
  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (n) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
      if (showToast) showToast(n.title, toastType(n.type));
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket, showToast]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await notificationApi.markRead(id); } catch { /* optimistic */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try { await notificationApi.markAllRead(); } catch { /* optimistic */ }
  }, []);

  return (
    <InboxContext.Provider value={{ items, unread, markRead, markAllRead }}>
      {children}
    </InboxContext.Provider>
  );
};

export const useInbox = () => useContext(InboxContext);

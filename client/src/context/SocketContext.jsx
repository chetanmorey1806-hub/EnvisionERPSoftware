import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext({ socket: null, online: 0, onlineIds: [], connected: false });

// The socket server shares the API origin (strip the trailing /api).
const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(0);
  // The ids, not just the count — the chat widget needs to know WHO is online
  // to show a presence dot next to each person.
  const [onlineIds, setOnlineIds] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!isAuthenticated || !token) return undefined;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('presence:update', (p) => {
      setOnline(p?.onlineUsers ?? 0);
      setOnlineIds((p?.userIds || []).map(Number));
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.close();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setOnlineIds([]);
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, online, onlineIds, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

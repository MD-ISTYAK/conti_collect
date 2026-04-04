import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (onEvent) => {
  const socketRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join:room', { userId: user._id, role: user.role });
    });

    // Listen to events
    socketRef.current.on('complaint:status_changed', (data) => onEvent?.('status_changed', data));
    socketRef.current.on('complaint:new', (data) => onEvent?.('new_complaint', data));
    socketRef.current.on('pickup:completed', (data) => onEvent?.('pickup_completed', data));
    socketRef.current.on('dashboard:stats_updated', (data) => onEvent?.('stats_updated', data));
    socketRef.current.on('notification:new', (data) => onEvent?.('notification', data));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  return socketRef;
};

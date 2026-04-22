import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../api/client';

const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    getNotifications().then(setNotifications).catch(console.error);
    getUnreadCount().then((d) => setUnreadCount(d.count)).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,        
      reconnectionDelayMax: 30000,   
      randomizationFactor: 0.5,    
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_error', (err) => {
      console.error('Reconnection failed:', err.message);
    });

    socket.on('notifications', (newOnes) => {
      setNotifications((prev) => [...newOnes, ...prev]);
      setUnreadCount((prev) => prev + newOnes.length);
    });

    return () => socket.disconnect();
  }, [userId]);

  const handleMarkAsRead = useCallback(async (id) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    open,
    setOpen,
    connected,
    handleMarkAsRead,
    handleMarkAllAsRead,
  };
};

export default useNotifications;
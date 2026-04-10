import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../api/client';

let socket = null;

const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    getNotifications().then(setNotifications).catch(console.error);
    getUnreadCount().then((d) => setUnreadCount(d.count)).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    socket = io(import.meta.env.VITE_API_URL, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join', userId);
    });
    socket.on('notifications', (newOnes) => {
      setNotifications((prev) => [...newOnes, ...prev]);
      setUnreadCount((prev) => prev + newOnes.length);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
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
    handleMarkAsRead,
    handleMarkAllAsRead,
  };
};

export default useNotifications;
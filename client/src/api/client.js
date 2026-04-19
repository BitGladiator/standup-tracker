const BASE_URL = import.meta.env.VITE_API_URL;

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw error;
  }

  return res.json();
};

export const getMe = () => apiFetch('/auth/me');
export const logout = () => apiFetch('/auth/logout', { method: 'POST' });

export const generateStandup = () => apiFetch('/standup/generate');
export const getTodayStandup = () => apiFetch('/standup/today');
export const saveStandup = (data) =>
  apiFetch('/standup', { method: 'POST', body: JSON.stringify(data) });
export const getStandupHistory = () => apiFetch('/standup/history');

export const saveSession = (data) =>
  apiFetch('/sessions', { method: 'POST', body: JSON.stringify(data) });
export const getSessionStats = () => apiFetch('/sessions/stats');
export const getTodaySessions = () => apiFetch('/sessions/today');

export const getSettings = () => apiFetch('/settings');
export const saveSettings = (data) =>
  apiFetch('/settings', { method: 'PUT', body: JSON.stringify(data) });

export const getNotifications = () => apiFetch('/notifications');
export const getUnreadCount = () => apiFetch('/notifications/unread-count');
export const markAsRead = (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllAsRead = () => apiFetch('/notifications/read-all', { method: 'PUT' });
export const triggerPRCheck = () =>
  apiFetch('/notifications/trigger-check', { method: 'POST' });

export const getTodayJournal = () => apiFetch('/journals/today');
export const getJournalHistory = () => apiFetch('/journals/history');
export const saveJournal = (data) =>
  apiFetch('/journals', { method: 'POST', body: JSON.stringify(data) });
export const getScoreTrend = () => apiFetch('/standup/score-trend');
export const getHeatmap = () => apiFetch('/heatmap');
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
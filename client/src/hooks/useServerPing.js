import { useEffect } from 'react';

const PING_INTERVAL_MS = 14 * 60 * 1000;
const HEALTH_URL = `${import.meta.env.VITE_API_URL}/api/health`;


const useServerPing = () => {
  useEffect(() => {
    const ping = () => {
      fetch(HEALTH_URL, { method: 'GET' }).catch(() => {
        
      });
    };

    ping();

    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);
};

export default useServerPing;

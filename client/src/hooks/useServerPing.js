import { useEffect, useRef } from 'react';


const PING_INTERVAL_MS = 10 * 60 * 1000;

const useServerPing = () => {
  const intervalRef = useRef(null);

  useEffect(() => {
    const HEALTH_URL = `${import.meta.env.VITE_API_URL}/api/health`;

    const ping = async () => {
      try {
        const res = await fetch(HEALTH_URL, {
          method: 'GET',
          // keepalive ensures the request completes even if the tab is backgrounded
          keepalive: true,
        });
        if (!res.ok) {
          console.warn(`[ServerPing] Health check returned ${res.status}`);
        }
      } catch (err) {
        console.warn('[ServerPing] Failed to reach server:', err.message);
      }
    };


    ping();

    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};

export default useServerPing;


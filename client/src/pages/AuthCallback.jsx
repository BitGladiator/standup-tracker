import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeToken } from '../api/client';
import { useAuth } from '../hooks/useAuth.jsx';


const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    // Prevent double-call in React strict mode
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    exchangeToken(token)
      .then(({ user, token: sessionToken }) => {

        if (sessionToken) {
          sessionStorage.setItem('auth_token', sessionToken);
        }
        setUser(user);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=auth_failed', { replace: true });
      });
  }, [navigate, setUser]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: 16,
    }}>
      <p style={{ fontSize: 18 }}>Signing you in…</p>
    </div>
  );
};

export default AuthCallback;

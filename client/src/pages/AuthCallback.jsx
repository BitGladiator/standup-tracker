import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeToken } from '../api/client';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * This page handles the OAuth callback for cross-origin deployments.
 *
 * Flow:
 *   GitHub → Render (/api/auth/callback) → Vercel (/auth/callback?token=...)
 *                                                         ↓
 *                                          POST /api/auth/exchange  ← sets httpOnly cookie
 *                                                         ↓
 *                                               navigate('/dashboard')
 *
 * Why this page exists:
 *   Browsers silently drop Set-Cookie headers on cross-origin 302 redirects.
 *   By landing here first and making a fetch() call, the browser properly
 *   stores the cookie returned from the /exchange JSON response.
 */
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
        // Store token so all subsequent API calls send it as Authorization: Bearer.
        // sessionStorage persists across navigation within the same tab but is
        // cleared when the browser closes — provides a good security/UX balance.
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

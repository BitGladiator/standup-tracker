const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: 'read:user user:email repo',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});


router.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) throw new Error('No access token received');

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const githubUser = await userRes.json();

    const { rows } = await db.query(
      `INSERT INTO users (github_id, username, avatar_url, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (github_id)
       DO UPDATE SET access_token = $4, username = $2, avatar_url = $3
       RETURNING id, username, avatar_url`,
      [String(githubUser.id), githubUser.login, githubUser.avatar_url, accessToken]
    );

    const user = rows[0];

    // Sign a short-lived token (5 min) used ONLY for the exchange handshake.
    // The frontend will immediately exchange it for a proper httpOnly cookie.
    const tempToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '5m',
    });

    // CROSS-ORIGIN OAUTH FIX:
    // Browsers silently drop Set-Cookie headers on cross-origin 302 redirects.
    // Solution: redirect with the token as a URL param → frontend calls /exchange
    // → server sets the httpOnly cookie on a real JSON response (browsers store these).
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${tempToken}`);
  } catch (err) {
    console.error('Auth error:', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
});


// The frontend lands here after OAuth redirect, extracts the token from the URL,
// and POSTs it here. We verify it and set the real long-lived httpOnly cookie.
router.post('/exchange', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, username, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });

    // Issue the real 7-day session cookie on a JSON response (NOT a redirect).
    // Browsers properly store Set-Cookie from JSON responses; they drop it on redirects.
    const sessionToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isHttps = process.env.CLIENT_URL?.startsWith('https://');
    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: isHttps ? 'none' : 'lax',
    });

    res.json({ ok: true, user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});


router.post('/logout', (req, res) => {
  const isHttps = process.env.CLIENT_URL?.startsWith('https://');
  // Must mirror the exact same options used when setting the cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
  });
  res.json({ success: true });
});


router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, username, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
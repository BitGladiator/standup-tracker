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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // 'none' required for cross-origin cookies (Vercel frontend <-> Render backend)
      // 'lax' only works when frontend and backend share the same domain
      sameSite: isProduction ? 'none' : 'lax',
    });


    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error('Auth error:', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
});


router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  // Must mirror the same options used when setting the cookie, otherwise browser won't clear it
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
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
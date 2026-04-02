const express = require('express');
const authenticate = require('../middleware/authenticate');
const { fetchGithubActivity } = require('../services/githubService');
const { generateStandupDraft } = require('../services/standupGenerator');
const db = require('../db');

const router = express.Router();


router.get('/generate', authenticate, async (req, res) => {
  try {
    const activity = await fetchGithubActivity(req.userId);
    const draft = generateStandupDraft(activity);
    res.json({ draft, activity });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/today', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM standups
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', authenticate, async (req, res) => {
  const { yesterday, today, blockers, auto_generated } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO standups (user_id, yesterday, today, blockers, auto_generated)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date)
       DO UPDATE SET yesterday = $2, today = $3, blockers = $4
       RETURNING *`,
      [req.userId, yesterday, today, blockers, auto_generated || false]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM standups
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
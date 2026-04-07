const express = require('express');
const authenticate = require('../middleware/authenticate');
const { fetchGithubActivity } = require('../services/githubService');
const { generateStandupDraft } = require('../services/standupGenerator');
const { sendStandupToSlack } = require('../services/slackService');
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
      'SELECT * FROM standups WHERE user_id = $1 AND date = CURRENT_DATE',
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', authenticate, async (req, res) => {
  const { yesterday, today, blockers, auto_generated, send_to_slack } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO standups (user_id, yesterday, today, blockers, auto_generated)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date)
       DO UPDATE SET yesterday = $2, today = $3, blockers = $4
       RETURNING *`,
      [req.userId, yesterday, today, blockers, auto_generated || false]
    );

    const saved = rows[0];

   
    if (send_to_slack) {
      const { rows: userRows } = await db.query(
        'SELECT username, slack_webhook_url FROM users WHERE id = $1',
        [req.userId]
      );
      const user = userRows[0];

      if (user?.slack_webhook_url) {
        try {
          await sendStandupToSlack(user.slack_webhook_url, saved, user.username);
          saved.slack_sent = true;
        } catch (slackErr) {
          console.error('Slack send failed:', slackErr);
          saved.slack_sent = false;
          saved.slack_error = 'Failed to send to Slack';
        }
      }
    }

    res.json(saved);
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
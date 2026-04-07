const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');

const router = express.Router();


router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT slack_webhook_url FROM users WHERE id = $1',
      [req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/', authenticate, async (req, res) => {
  const { slack_webhook_url } = req.body;

  try {
    await db.query(
      'UPDATE users SET slack_webhook_url = $1 WHERE id = $2',
      [slack_webhook_url, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
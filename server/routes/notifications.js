const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');

const router = express.Router();


router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.userId]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/read-all', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
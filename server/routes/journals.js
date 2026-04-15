const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');

const router = express.Router();

router.get('/today', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM journals WHERE user_id = $1 AND date = CURRENT_DATE',
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { problems_solved, how_it_was_done, notes } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO journals (user_id, problems_solved, how_it_was_done, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date)
       DO UPDATE SET problems_solved = $2, how_it_was_done = $3, notes = $4
       RETURNING *`,
      [req.userId, problems_solved, how_it_was_done, notes || '']
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM journals
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

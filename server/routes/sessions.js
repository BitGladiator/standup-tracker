const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');

const router = express.Router();


router.post('/', authenticate, async (req, res) => {
  const { label, started_at, ended_at, duration_minutes, pomodoro_count } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO focus_sessions (user_id, label, started_at, ended_at, duration_minutes, pomodoro_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, label || 'Focus session', started_at, ended_at, duration_minutes, pomodoro_count || 1]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/stats', authenticate, async (req, res) => {
  try {
    const { rows: dailyRows } = await db.query(
      `SELECT
         DATE(started_at) as date,
         SUM(duration_minutes) as total_minutes,
         COUNT(*) as session_count
       FROM focus_sessions
       WHERE user_id = $1
         AND started_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(started_at)
       ORDER BY date ASC`,
      [req.userId]
    );

    const { rows: totalsRows } = await db.query(
      `SELECT
         SUM(duration_minutes) as total_minutes,
         COUNT(*) as total_sessions,
         COUNT(DISTINCT DATE(started_at)) as total_days
       FROM focus_sessions
       WHERE user_id = $1`,
      [req.userId]
    );

    const { rows: streakRows } = await db.query(
      `WITH daily AS (
         SELECT DISTINCT DATE(started_at) as day
         FROM focus_sessions
         WHERE user_id = $1
         ORDER BY day DESC
       ),
       streaks AS (
         SELECT day,
           ROW_NUMBER() OVER (ORDER BY day DESC) as rn,
           day - (ROW_NUMBER() OVER (ORDER BY day DESC) || ' days')::INTERVAL as grp
         FROM daily
       )
       SELECT COUNT(*) as streak
       FROM streaks
       WHERE grp = (SELECT grp FROM streaks ORDER BY day DESC LIMIT 1)`,
      [req.userId]
    );

    res.json({
      daily: dailyRows,
      totals: totalsRows[0],
      streak: parseInt(streakRows[0]?.streak || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/today', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM focus_sessions
       WHERE user_id = $1
         AND DATE(started_at) = CURRENT_DATE
       ORDER BY started_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
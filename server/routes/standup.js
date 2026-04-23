const express = require('express');
const authenticate = require('../middleware/authenticate');
const { fetchGithubActivity } = require('../services/githubService');
const { generateStandupDraft } = require('../services/standupGenerator');
const { sendStandupToSlack } = require('../services/slackService');
const { standupScoringQueue } = require('../queues/index');
const { scoreStandup } = require('../services/standupScorer');
const db = require('../db');
const logger = require('../observability/logger');

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
      `SELECT s.*, ss.overall_score, ss.grade
       FROM standups s
       LEFT JOIN standup_scores ss ON ss.standup_id = s.id
       WHERE s.user_id = $1 AND s.date = CURRENT_DATE`,
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
        } catch {
          saved.slack_sent = false;
        }
      }
    }

    
    const io = req.app.get('io');
    const job = await standupScoringQueue.add(
      {
        standup: saved,
        userId: req.userId,
      },
      {
        attempts: 3,                    
        backoff: {
          type: 'exponential',
          delay: 2000,                 
        },
        removeOnComplete: 100,        
        removeOnFail: 50,               
        timeout: 30000,                
      }
    );
    
    logger.info('Standup scoring job queued', {
      jobId: job.id,
      standupId: saved.id,
      userId: req.userId,
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, ss.overall_score, ss.grade, ss.overall_feedback
       FROM standups s
       LEFT JOIN standup_scores ss ON ss.standup_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.date DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/score-trend', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         s.date,
         ss.overall_score,
         ss.grade,
         ss.clarity_score,
         ss.specificity_score,
         ss.blocker_quality_score,
         ss.completeness_score
       FROM standups s
       JOIN standup_scores ss ON ss.standup_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.date ASC
       LIMIT 30`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');
const redis = require('../db/redis');

const router = express.Router();

const CACHE_TTL = 60 * 60 * 6; 

const githubFetch = async (url, token) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
};

router.get('/', authenticate, async (req, res) => {
  try {
    const cacheKey = `heatmap:${req.userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { rows } = await db.query(
      'SELECT username, access_token FROM users WHERE id = $1',
      [req.userId]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const { username, access_token: token } = rows[0];

   
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const sinceISO = since.toISOString().split('T')[0];

   
    const [commitsData, prsData, reviewsData] = await Promise.all([
      githubFetch(
        `https://api.github.com/search/commits?q=author:${username}+committer-date:>=${sinceISO}&per_page=100&sort=committer-date`,
        token
      ),
      githubFetch(
        `https://api.github.com/search/issues?q=author:${username}+type:pr+created:>=${sinceISO}&per_page=100`,
        token
      ),
      githubFetch(
        `https://api.github.com/search/issues?q=reviewed-by:${username}+type:pr+updated:>=${sinceISO}&per_page=100`,
        token
      ),
    ]);

    
    const activityMap = {};

    const addActivity = (dateStr, type) => {
      if (!activityMap[dateStr]) {
        activityMap[dateStr] = { commits: 0, prs: 0, reviews: 0, total: 0 };
      }
      activityMap[dateStr][type]++;
      activityMap[dateStr].total++;
    };

    (commitsData.items || []).forEach((item) => {
      const date = item.commit.committer.date.split('T')[0];
      addActivity(date, 'commits');
    });

    (prsData.items || []).forEach((item) => {
      const date = item.created_at.split('T')[0];
      addActivity(date, 'prs');
    });

    (reviewsData.items || []).forEach((item) => {
      const date = item.updated_at.split('T')[0];
      addActivity(date, 'reviews');
    });

 
    const days = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        ...(activityMap[dateStr] || { commits: 0, prs: 0, reviews: 0, total: 0 }),
      });
    }

   
    const totalContributions = days.reduce((s, d) => s + d.total, 0);
    const maxActivity = Math.max(...days.map((d) => d.total), 1);


    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < days.length; i++) {
      if (days[i].total > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }


    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].total > 0) currentStreak++;
      else break;
    }


    const mostActiveDay = days.reduce(
      (best, d) => (d.total > best.total ? d : best),
      days[0]
    );

    const result = {
      days,
      stats: {
        totalContributions,
        maxActivity,
        longestStreak,
        currentStreak,
        mostActiveDay,
      },
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
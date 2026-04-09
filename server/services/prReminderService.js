const db = require('../db');
const redis = require('../db/redis');
const { sendStandupToSlack } = require('./slackService');

const STALE_HOURS = 48;

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

const getStalePRs = async (username, token) => {
  const staleDate = new Date();
  staleDate.setHours(staleDate.getHours() - STALE_HOURS);
  const staleDateISO = staleDate.toISOString().split('T')[0];

 
  const data = await githubFetch(
    `https://api.github.com/search/issues?q=author:${username}+type:pr+state:open+updated:<=${staleDateISO}&sort=updated&order=asc&per_page=10`,
    token
  );

  return (data.items || []).map((pr) => ({
    title: pr.title,
    url: pr.html_url,
    repo: pr.repository_url.split('/').slice(-2).join('/'),
    updatedAt: pr.updated_at,
    number: pr.number,
  }));
};

const checkAlreadyReminded = async (userId, prUrl) => {
  const key = `pr_reminder:${userId}:${Buffer.from(prUrl).toString('base64')}`;
  const exists = await redis.get(key);
  return !!exists;
};

const markReminded = async (userId, prUrl) => {
  const key = `pr_reminder:${userId}:${Buffer.from(prUrl).toString('base64')}`;
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
  await redis.setex(key, secondsUntilMidnight, '1');
};

const createNotification = async (userId, pr) => {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, pr_url, pr_title, repo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      'pr_reminder',
      'PR needs attention',
      `No activity in over ${STALE_HOURS} hours`,
      pr.url,
      pr.title,
      pr.repo,
    ]
  );
  return rows[0];
};

const runPRReminders = async (io) => {
  console.log('Running PR reminder check...');

  try {
    const { rows: users } = await db.query(
      'SELECT id, username, access_token, slack_webhook_url FROM users'
    );

    for (const user of users) {
      try {
        const stalePRs = await getStalePRs(user.username, user.access_token);

        if (stalePRs.length === 0) continue;

        const newReminders = [];

        for (const pr of stalePRs) {
          const alreadyReminded = await checkAlreadyReminded(user.id, pr.url);
          if (alreadyReminded) continue;
          const notification = await createNotification(user.id, pr);
          newReminders.push(notification);

          await markReminded(user.id, pr.url);
        }

        if (newReminders.length === 0) continue;

     
        if (io) {
          io.to(`user:${user.id}`).emit('notifications', newReminders);
        }

     
        if (user.slack_webhook_url) {
          const prList = newReminders
            .map((n) => `• <${n.pr_url}|${n.pr_title}> — ${n.repo}`)
            .join('\n');

          const text = `*PR Review Reminder*\nThe following PRs have had no activity for over ${STALE_HOURS} hours:\n\n${prList}`;

          await fetch(user.slack_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          }).catch((err) => console.error('Slack reminder failed:', err));
        }

        console.log(`Sent ${newReminders.length} reminders to user ${user.username}`);
      } catch (userErr) {
        console.error(`PR reminder failed for user ${user.username}:`, userErr.message);
      }
    }
  } catch (err) {
    console.error('PR reminder job error:', err);
  }
};

module.exports = { runPRReminders };
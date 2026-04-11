const db = require('../db');
const redis = require('../db/redis');

const CACHE_TTL = 30 * 60;

const githubFetch = async (url, token) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  return res.json();
};

const getYesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]; 
};

// const fetchGithubActivity = async (userId) => {
//   const cacheKey = `github_activity:${userId}`;
//   const cached = await redis.get(cacheKey);
//   if (cached) {
//     console.log(`Cache hit for user ${userId}`);
//     return JSON.parse(cached);
//   }

//   const { rows } = await db.query(
//     'SELECT username, access_token FROM users WHERE id = $1',
//     [userId]
//   );

//   if (!rows[0]) throw new Error('User not found');

//   const { username, access_token: token } = rows[0];
//   const since = getYesterdayISO();

//   const [commitsData, prsData, reviewsData] = await Promise.all([
//     githubFetch(
//       `https://api.github.com/search/commits?q=author:${username}+committer-date:>=${since}&sort=committer-date&order=desc&per_page=20`,
//       token
//     ),

//     githubFetch(
//       `https://api.github.com/search/issues?q=author:${username}+type:pr+updated:>=${since}&sort=updated&order=desc&per_page=10`,
//       token
//     ),

//     githubFetch(
//       `https://api.github.com/search/issues?q=reviewed-by:${username}+type:pr+updated:>=${since}&sort=updated&order=desc&per_page=10`,
//       token
//     ),
//   ]);


//   const activity = {
//     commits: (commitsData.items || []).map((item) => ({
//       message: item.commit.message.split('\n')[0], 
//       repo: item.repository.full_name,
//       url: item.html_url,
//       date: item.commit.committer.date,
//     })),

//     prs: (prsData.items || []).map((item) => ({
//       title: item.title,
//       repo: item.repository_url.split('/').slice(-2).join('/'),
//       url: item.html_url,
//       state: item.state,
//       draft: item.draft || false,
//       updatedAt: item.updated_at,
//     })),

//     reviews: (reviewsData.items || []).map((item) => ({
//       title: item.title,
//       repo: item.repository_url.split('/').slice(-2).join('/'),
//       url: item.html_url,
//       state: item.state,
//       updatedAt: item.updated_at,
//     })),
//   };

//   await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(activity));

//   await db.query(
//     `INSERT INTO github_activity (user_id, commits, prs, reviews)
//      VALUES ($1, $2, $3, $4)
//      ON CONFLICT DO NOTHING`,
//     [
//       userId,
//       JSON.stringify(activity.commits),
//       JSON.stringify(activity.prs),
//       JSON.stringify(activity.reviews),
//     ]
//   );

//   return activity;
// };
const fetchGithubActivity = async (userId) => {
  
  return {
    commits: [
      { message: 'fix JWT expiry bug', repo: 'yourname/auth-service', url: 'https://github.com', date: new Date().toISOString() },
      { message: 'add Redis caching middleware', repo: 'yourname/backend', url: 'https://github.com', date: new Date().toISOString() },
      { message: 'update Docker compose ports', repo: 'yourname/backend', url: 'https://github.com', date: new Date().toISOString() },
    ],
    prs: [
      { title: 'Add Redis caching layer', repo: 'yourname/backend', url: 'https://github.com/yourname/backend/pull/12', state: 'open', draft: false, updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { title: 'Fix JWT expiry edge case', repo: 'yourname/auth-service', url: 'https://github.com/yourname/auth-service/pull/7', state: 'open', draft: true, updatedAt: new Date().toISOString() },
    ],
    reviews: [
      { title: 'Update deployment docs', repo: 'yourname/devops', url: 'https://github.com/yourname/devops/pull/5', state: 'open', updatedAt: new Date().toISOString() },
    ],
  };
};


module.exports = { fetchGithubActivity };
const db = require('../db');
const redis = require('../db/redis');
const {
  githubApiCalls,
  githubApiDuration,
  cacheOperations,
} = require('../observability/metrics');
const logger = require('../observability/logger');

const CACHE_TTL = 30 * 60;

const githubFetch = async (url, token, endpoint = 'unknown') => {
  const end = githubApiDuration.startTimer({ endpoint });
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const status = res.ok ? 'success' : 'error';
    githubApiCalls.inc({ endpoint, status });
    end();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${res.status}`);
    }

    return res.json();
  } catch (err) {
    githubApiCalls.inc({ endpoint, status: 'error' });
    end();
    logger.error('GitHub API call failed', { endpoint, error: err.message });
    throw err;
  }
};

const getYesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const fetchGithubActivity = async (userId) => {
  const cacheKey = `github_activity:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    cacheOperations.inc({ operation: 'get', result: 'hit' });
    logger.debug('GitHub activity cache hit', { userId });
    return JSON.parse(cached);
  }

  cacheOperations.inc({ operation: 'get', result: 'miss' });

  const { rows } = await db.query(
    'SELECT username, access_token FROM users WHERE id = $1',
    [userId],
    'get_user_for_activity'
  );

  if (!rows[0]) throw new Error('User not found');

  const { username, access_token: token } = rows[0];
  const since = getYesterdayISO();

  logger.info('Fetching GitHub activity', { userId, username, since });

  const [commitsData, prsData, reviewsData] = await Promise.all([
    githubFetch(
      `https://api.github.com/search/commits?q=author:${username}+committer-date:>=${since}&sort=committer-date&order=desc&per_page=20`,
      token,
      'search_commits'
    ),
    githubFetch(
      `https://api.github.com/search/issues?q=author:${username}+type:pr+updated:>=${since}&sort=updated&order=desc&per_page=10`,
      token,
      'search_prs'
    ),
    githubFetch(
      `https://api.github.com/search/issues?q=reviewed-by:${username}+type:pr+updated:>=${since}&sort=updated&order=desc&per_page=10`,
      token,
      'search_reviews'
    ),
  ]);

  const activity = {
    commits: (commitsData.items || []).map((item) => ({
      message: item.commit.message.split('\n')[0],
      repo: item.repository.full_name,
      url: item.html_url,
      date: item.commit.committer.date,
    })),
    prs: (prsData.items || []).map((item) => ({
      title: item.title,
      repo: item.repository_url.split('/').slice(-2).join('/'),
      url: item.html_url,
      state: item.state,
      draft: item.draft || false,
      updatedAt: item.updated_at,
    })),
    reviews: (reviewsData.items || []).map((item) => ({
      title: item.title,
      repo: item.repository_url.split('/').slice(-2).join('/'),
      url: item.html_url,
      state: item.state,
      updatedAt: item.updated_at,
    })),
  };

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(activity));
  cacheOperations.inc({ operation: 'set', result: 'hit' });

  await db.query(
    `INSERT INTO github_activity (user_id, commits, prs, reviews)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [userId, JSON.stringify(activity.commits), JSON.stringify(activity.prs), JSON.stringify(activity.reviews)],
    'insert_github_activity'
  );

  return activity;
};

module.exports = { fetchGithubActivity };
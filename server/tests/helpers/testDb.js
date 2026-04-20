const db = require('../../db');

const setupTestDb = async () => {
  await db.query(`
    TRUNCATE TABLE
      standup_scores,
      notifications,
      github_activity,
      focus_sessions,
      standups,
      users
    RESTART IDENTITY CASCADE
  `);
};

const createTestUser = async (overrides = {}) => {
  const { rows } = await db.query(
    `INSERT INTO users (github_id, username, avatar_url, access_token)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      overrides.github_id || 'test_github_123',
      overrides.username || 'testuser',
      overrides.avatar_url || 'https://github.com/testuser.png',
      overrides.access_token || 'test_token_abc',
    ]
  );
  return rows[0];
};

const createTestStandup = async (userId, overrides = {}) => {
  const { rows } = await db.query(
    `INSERT INTO standups (user_id, yesterday, today, blockers, auto_generated)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      overrides.yesterday || 'Fixed auth bug, reviewed 2 PRs',
      overrides.today || 'Deploy rate limiter to staging',
      overrides.blockers || 'None',
      overrides.auto_generated || false,
    ]
  );
  return rows[0];
};

module.exports = { setupTestDb, createTestUser, createTestStandup };
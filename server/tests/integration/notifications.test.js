const request = require('supertest');
const { createTestServer, getAuthCookie } = require('../helpers/testServer');
const { setupTestDb, createTestUser } = require('../helpers/testDb');
const db = require('../../db');

const app = createTestServer();
let testUser;
let authCookie;

beforeEach(async () => {
  await setupTestDb();
  testUser = await createTestUser();
  authCookie = getAuthCookie(testUser.id);
});

const createTestNotification = async (userId, overrides = {}) => {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, pr_url, pr_title, repo, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      overrides.type || 'pr_reminder',
      overrides.title || 'PR needs attention',
      overrides.body || 'No activity in 48 hours',
      overrides.pr_url || 'https://github.com/org/repo/pull/1',
      overrides.pr_title || 'Add Redis caching',
      overrides.repo || 'org/repo',
      overrides.read || false,
    ]
  );
  return rows[0];
};

describe('GET /api/notifications', () => {
  test('returns empty array when no notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns notifications for authenticated user', async () => {
    await createTestNotification(testUser.id);
    await createTestNotification(testUser.id, { pr_title: 'Fix JWT bug' });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('does not return notifications from other users', async () => {
    const otherUser = await createTestUser({
      github_id: 'other_789',
      username: 'otheruser',
    });
    await createTestNotification(otherUser.id);

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  test('returns notifications in descending order', async () => {
    await createTestNotification(testUser.id, { pr_title: 'First' });
    await createTestNotification(testUser.id, { pr_title: 'Second' });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body[0].pr_title).toBe('Second');
    expect(res.body[1].pr_title).toBe('First');
  });
});

describe('GET /api/notifications/unread-count', () => {
  test('returns 0 when no notifications', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  test('returns correct unread count', async () => {
    await createTestNotification(testUser.id, { read: false });
    await createTestNotification(testUser.id, { read: false });
    await createTestNotification(testUser.id, { read: true });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  test('marks notification as read', async () => {
    const notification = await createTestNotification(testUser.id, { read: false });

    const res = await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

  
    const { rows } = await db.query(
      'SELECT read FROM notifications WHERE id = $1',
      [notification.id]
    );
    expect(rows[0].read).toBe(true);
  });

  test('cannot mark another users notification as read', async () => {
    const otherUser = await createTestUser({
      github_id: 'other_999',
      username: 'otheruser2',
    });
    const notification = await createTestNotification(otherUser.id);

    await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Cookie', authCookie);
    const { rows } = await db.query(
      'SELECT read FROM notifications WHERE id = $1',
      [notification.id]
    );
    expect(rows[0].read).toBe(false);
  });
});

describe('PUT /api/notifications/read-all', () => {
  test('marks all notifications as read', async () => {
    await createTestNotification(testUser.id, { read: false });
    await createTestNotification(testUser.id, { read: false });
    await createTestNotification(testUser.id, { read: false });

    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);

    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [testUser.id]
    );
    expect(parseInt(rows[0].count)).toBe(0);
  });

  test('only marks current users notifications as read', async () => {
    const otherUser = await createTestUser({
      github_id: 'other_111',
      username: 'otheruser3',
    });
    await createTestNotification(otherUser.id, { read: false });

    await request(app)
      .put('/api/notifications/read-all')
      .set('Cookie', authCookie);

   
    const { rows } = await db.query(
      'SELECT read FROM notifications WHERE user_id = $1',
      [otherUser.id]
    );
    expect(rows[0].read).toBe(false);
  });
});
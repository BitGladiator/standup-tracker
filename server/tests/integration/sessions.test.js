const request = require('supertest');
const { createTestServer, getAuthCookie } = require('../helpers/testServer');
const { setupTestDb, createTestUser } = require('../helpers/testDb');

const app = createTestServer();
let testUser;
let authCookie;

beforeEach(async () => {
  await setupTestDb();
  testUser = await createTestUser();
  authCookie = getAuthCookie(testUser.id);
});

describe('POST /api/sessions', () => {
  test('saves a focus session', async () => {
    const now = new Date();
    const payload = {
      label: 'Working on tests',
      started_at: new Date(now - 25 * 60 * 1000).toISOString(),
      ended_at: now.toISOString(),
      duration_minutes: 25,
      pomodoro_count: 1,
    };

    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', authCookie)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Working on tests');
    expect(res.body.duration_minutes).toBe(25);
    expect(res.body.user_id).toBe(testUser.id);
  });

  test('defaults label to Focus session when not provided', async () => {
    const now = new Date();
    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', authCookie)
      .send({
        started_at: new Date(now - 25 * 60 * 1000).toISOString(),
        ended_at: now.toISOString(),
        duration_minutes: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Focus session');
  });
});

describe('GET /api/sessions/stats', () => {
  test('returns zero stats for new user', async () => {
    const res = await request(app)
      .get('/api/sessions/stats')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(parseInt(res.body.totals.total_minutes || 0)).toBe(0);
    expect(res.body.streak).toBe(0);
  });
});
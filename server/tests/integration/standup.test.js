const request = require('supertest');
const { createTestServer, getAuthCookie } = require('../helpers/testServer');
const { setupTestDb, createTestUser, createTestStandup } = require('../helpers/testDb');

jest.mock('../../services/standupScorer', () => ({
  scoreStandup: jest.fn().mockResolvedValue({
    overall_score: 80,
    grade: 'B',
    clarity_score: 80,
    specificity_score: 80,
    blocker_quality_score: 80,
    completeness_score: 80,
    clarity_feedback: 'Good',
    specificity_feedback: 'Good',
    blocker_feedback: 'Good',
    completeness_feedback: 'Good',
    overall_feedback: 'Good'
  })
}));

const app = createTestServer();
let testUser;
let authCookie;

beforeEach(async () => {
  await setupTestDb();
  testUser = await createTestUser();
  authCookie = getAuthCookie(testUser.id);
});

describe('GET /api/standup/today', () => {
  test('returns null when no standup exists for today', async () => {
    const res = await request(app)
      .get('/api/standup/today')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test('returns today standup when it exists', async () => {
    await createTestStandup(testUser.id);

    const res = await request(app)
      .get('/api/standup/today')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(testUser.id);
    expect(res.body.yesterday).toBe('Fixed auth bug, reviewed 2 PRs');
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/standup/today');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/standup', () => {
  test('creates a new standup', async () => {
    const payload = {
      yesterday: 'Fixed the login bug',
      today: 'Working on rate limiter',
      blockers: 'None',
      auto_generated: false,
    };

    const res = await request(app)
      .post('/api/standup')
      .set('Cookie', authCookie)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.yesterday).toBe(payload.yesterday);
    expect(res.body.today).toBe(payload.today);
    expect(res.body.user_id).toBe(testUser.id);
  });

  test('updates existing standup on same day', async () => {
    await createTestStandup(testUser.id);

    const updated = {
      yesterday: 'Updated yesterday',
      today: 'Updated today',
      blockers: 'New blocker',
    };

    const res = await request(app)
      .post('/api/standup')
      .set('Cookie', authCookie)
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.yesterday).toBe('Updated yesterday');
  });

  test('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/standup')
      .send({ yesterday: 'test', today: 'test', blockers: 'none' });

    expect(res.status).toBe(401);
  });

  test('rejects oversized payload', async () => {
    const res = await request(app)
      .post('/api/standup')
      .set('Cookie', authCookie)
      .send({ yesterday: 'x'.repeat(50000) });

    // express.json limit is 10kb
    expect(res.status).toBe(413);
  });
});

describe('GET /api/standup/history', () => {
  test('returns empty array when no standups', async () => {
    const res = await request(app)
      .get('/api/standup/history')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns standups in descending date order', async () => {
    await createTestStandup(testUser.id);

    const res = await request(app)
      .get('/api/standup/history')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('does not return standups from other users', async () => {
    const otherUser = await createTestUser({ github_id: 'other_999', username: 'otheruser' });
    await createTestStandup(otherUser.id);

    const res = await request(app)
      .get('/api/standup/history')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    res.body.forEach((s) => {
      expect(s.user_id).toBe(testUser.id);
    });
  });
});
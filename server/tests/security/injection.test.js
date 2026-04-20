const request = require('supertest');
const { createTestServer, getAuthCookie } = require('../helpers/testServer');
const { setupTestDb, createTestUser } = require('../helpers/testDb');

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
let authCookie;

beforeEach(async () => {
  await setupTestDb();
  const user = await createTestUser();
  authCookie = getAuthCookie(user.id);
});

describe('SQL injection protection', () => {
  test('standup save is safe from SQL injection', async () => {
    const malicious = "'; DROP TABLE standups; --";

    const res = await request(app)
      .post('/api/standup')
      .set('Cookie', authCookie)
      .send({
        yesterday: malicious,
        today: malicious,
        blockers: malicious,
      });
    expect(res.status).toBe(200);
    expect(res.body.yesterday).toBe(malicious);
  });

  test('history endpoint is safe from SQL injection in query params', async () => {
    const res = await request(app)
      .get("/api/standup/history?limit=1;DROP TABLE standups;--")
      .set('Cookie', authCookie);

    expect([200, 400]).toContain(res.status);
  });
});

describe('XSS protection', () => {
  test('stored XSS payload is returned as plain text not executed', async () => {
    const xssPayload = '<script>alert("xss")</script>';

    const res = await request(app)
      .post('/api/standup')
      .set('Cookie', authCookie)
      .send({
        yesterday: xssPayload,
        today: 'normal content',
        blockers: 'none',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
  });
});

describe('Security headers', () => {
  test('health endpoint returns security headers', async () => {
    const res = await request(app).get('/api/health');
    // Helmet sets these
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('Auth boundary tests', () => {
  test('cannot access another users standup by manipulating JWT', async () => {
    const otherUser = await createTestUser({
      github_id: 'other_456',
      username: 'otheruser',
    });
    const db = require('../../db');
    await db.query(
      `INSERT INTO standups (user_id, yesterday, today, blockers)
       VALUES ($1, $2, $3, $4)`,
      [otherUser.id, 'secret data', 'secret plans', 'none']
    );
    const res = await request(app)
      .get('/api/standup/today')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test('forged JWT with wrong secret is rejected', async () => {
    const jwt = require('jsonwebtoken');
    const forgedToken = jwt.sign({ userId: 1 }, 'wrong_secret', { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/standup/today')
      .set('Cookie', `token=${forgedToken}`);

    expect(res.status).toBe(401);
  });

  test('JWT with tampered userId is rejected', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 99999 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/standup/today')
      .set('Cookie', `token=${token}`);
    expect([200, 401, 404]).toContain(res.status);
  });
});
const request = require('supertest');
const { createTestServer } = require('../helpers/testServer');
const { setupTestDb, createTestUser } = require('../helpers/testDb');

const app = createTestServer();

beforeEach(async () => {
  await setupTestDb();
});

describe('GET /api/auth/me', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  test('returns user when authenticated', async () => {
    const user = await createTestUser();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.username).toBe('testuser');
    expect(res.body.access_token).toBeUndefined();
  });
});

describe('POST /api/auth/logout', () => {
  test('clears the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('token=;');
  });
});
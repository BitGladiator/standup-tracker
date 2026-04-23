const mockRedisClient = {
  call: jest.fn().mockResolvedValue('OK'),
};

jest.mock('../../db/redis', () => mockRedisClient);

const mockRateLimit = jest.fn((config) => {
  const middleware = (req, res, next) => {
    if (req._simulateRateLimit) {
      return res.status(429).json({ error: config.message?.error || 'Too many requests' });
    }
    next();
  };
  middleware._config = config;
  return middleware;
});

const mockSlowDown = jest.fn((config) => {
  const middleware = (req, res, next) => next();
  middleware._config = config;
  return middleware;
});

jest.mock('express-rate-limit', () => mockRateLimit);
jest.mock('express-slow-down', () => mockSlowDown);
jest.mock('rate-limit-redis', () =>
  jest.fn().mockImplementation(() => ({ type: 'redis-store' }))
);

const {
  globalLimiter,
  authLimiter,
  githubLimiter,
  speedLimiter,
} = require('../../middleware/rateLimiter');

const mockReq = (overrides = {}) => ({
  ip: '127.0.0.1',
  path: '/api/test',
  userId: 1,
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('rateLimiter middleware', () => {
  describe('globalLimiter', () => {
    test('allows normal requests through', () => {
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      globalLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('blocks requests when rate limit is exceeded', () => {
      const req = mockReq({ _simulateRateLimit: true });
      const res = mockRes();
      const next = jest.fn();

      globalLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    test('is configured with correct window and max', () => {
      expect(globalLimiter._config.windowMs).toBe(60 * 1000);
      expect(globalLimiter._config.max).toBe(200);
    });
  });

  describe('authLimiter', () => {
    test('allows normal auth requests', () => {
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      authLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('blocks when auth rate limit exceeded', () => {
      const req = mockReq({ _simulateRateLimit: true });
      const res = mockRes();
      const next = jest.fn();

      authLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('has stricter limit than global — 10 requests per 15 minutes', () => {
      expect(authLimiter._config.max).toBe(10);
      expect(authLimiter._config.windowMs).toBe(15 * 60 * 1000);
    });

    test('returns correct error message', () => {
      const req = mockReq({ _simulateRateLimit: true });
      const res = mockRes();
      const next = jest.fn();

      authLimiter(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('auth') })
      );
    });
  });

  describe('githubLimiter', () => {
    test('uses userId as key generator when available', () => {
      const keyGen = githubLimiter._config.keyGenerator;
      const req = mockReq({ userId: 42 });
      expect(keyGen(req)).toBe('user:42');
    });

    test('falls back to IP when userId not available', () => {
      const keyGen = githubLimiter._config.keyGenerator;
      const req = mockReq({ userId: undefined });
      expect(keyGen(req)).toBe('user:127.0.0.1');
    });

    test('is limited to 10 requests per hour', () => {
      expect(githubLimiter._config.max).toBe(10);
      expect(githubLimiter._config.windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe('speedLimiter', () => {
    test('passes requests through normally', () => {
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      speedLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('is configured with correct delay threshold', () => {
      expect(speedLimiter._config.delayAfter).toBe(50);
      expect(speedLimiter._config.windowMs).toBe(60 * 1000);
    });
  });
});
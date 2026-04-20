const jwt = require('jsonwebtoken');
const authenticate = require('../../middleware/authenticate');

process.env.JWT_SECRET = 'test_secret';

const mockReq = (token) => ({
  cookies: { token },
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticate middleware', () => {
  test('rejects request with no token', () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with invalid token', () => {
    const req = mockReq('invalid.token.here');
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects expired token', () => {
    const expired = jwt.sign({ userId: 1 }, 'test_secret', { expiresIn: '-1s' });
    const req = mockReq(expired);
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid token and sets userId', () => {
    const token = jwt.sign({ userId: 42 }, 'test_secret', { expiresIn: '1h' });
    const req = mockReq(token);
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(42);
  });

  test('rejects token signed with wrong secret', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong_secret', { expiresIn: '1h' });
    const req = mockReq(token);
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
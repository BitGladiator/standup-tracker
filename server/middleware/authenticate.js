const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  // 1. Try httpOnly cookie first (Chrome, same-origin deployments)
  let token = req.cookies?.token;

  // 2. Fall back to Authorization: Bearer header (Safari ITP, all cross-origin scenarios)
  //    Safari blocks cross-origin cookies by default regardless of SameSite=None.
  //    Sending the token as a header bypasses this restriction entirely.
  if (!token) {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
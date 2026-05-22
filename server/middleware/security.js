const helmet = require('helmet');
const compression = require('compression');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.github.com'],
    },
  },
  // Do NOT set crossOriginResourcePolicy here — it blocks credentialed
  // cross-origin cookie requests between Vercel (frontend) and Render (backend).
  // CORS middleware handles cross-origin access control instead.
  crossOriginResourcePolicy: false,
});

const compress = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
});

module.exports = { securityHeaders, compress };
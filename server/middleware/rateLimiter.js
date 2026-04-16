const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const slowDown = require('express-slow-down');
const redis = require('../db/redis');


const makeStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  });


const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:global:'),
  message: { error: 'Too many requests, please slow down.' },
  skip: (req) => req.path === '/api/health',
});



const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:auth:'),
  message: { error: 'Too many auth attempts, try again in 15 minutes.' },
});


const githubLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:github:'),
  keyGenerator: (req) => `user:${req.userId || req.ip}`,
  message: { error: 'GitHub generate limit reached. Try again in an hour.' },
});


const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 50,
  delayMs: (used) => (used - 50) * 500,
  store: makeStore('rl:slow:'),
});

module.exports = { globalLimiter, authLimiter, githubLimiter, speedLimiter };
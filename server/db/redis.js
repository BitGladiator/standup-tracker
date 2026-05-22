const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

// Pass tls option explicitly for Upstash (rediss://) — ioredis doesn't always auto-detect it
const redis = new Redis(redisUrl, isTls ? { tls: {} } : {});

if (process.env.NODE_ENV !== 'test') {
  redis.on('connect', () => console.log('Redis connected'));
}
redis.on('error', (err) => console.error('Redis error:', err));

module.exports = redis;
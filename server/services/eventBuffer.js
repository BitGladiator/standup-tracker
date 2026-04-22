const redis = require('../db/redis');
const logger = require('../observability/logger');

const BUFFER_TTL = 60 * 60 * 24;
const MAX_EVENTS_PER_USER = 50;   

const bufferEvent = async (userId, event, data) => {
  const key = `events:${userId}`;
  const payload = JSON.stringify({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  try {
    await redis.rpush(key, payload);
    await redis.ltrim(key, -MAX_EVENTS_PER_USER, -1);
    await redis.expire(key, BUFFER_TTL);

    logger.debug('Event buffered', { userId, event });
  } catch (err) {
    logger.error('Failed to buffer event', { userId, event, error: err.message });
  }
};

const getBufferedEvents = async (userId) => {
  const key = `events:${userId}`;
  try {
    const events = await redis.lrange(key, 0, -1);
    return events.map((e) => JSON.parse(e));
  } catch (err) {
    logger.error('Failed to get buffered events', { userId, error: err.message });
    return [];
  }
};

const clearBufferedEvents = async (userId) => {
  const key = `events:${userId}`;
  try {
    await redis.del(key);
    logger.debug('Cleared buffered events', { userId });
  } catch (err) {
    logger.error('Failed to clear buffered events', { userId, error: err.message });
  }
};

module.exports = { bufferEvent, getBufferedEvents, clearBufferedEvents };
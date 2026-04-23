const { closeAllQueues } = require('../../queues/index');
const db = require('../../db/index');
const redis = require('../../db/redis');

afterAll(async () => {
  await closeAllQueues();
  await db.end();
  await redis.quit();
});

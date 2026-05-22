const { closeAllQueues } = require('../../queues/index');
const db = require('../../db/index');
const redis = require('../../db/redis');


let cleanupScheduled = false;

if (!cleanupScheduled) {
  cleanupScheduled = true;
  process.on('beforeExit', async () => {
    await closeAllQueues();
    await db.end();
    await redis.quit();
  });
}

afterAll(async () => {
  
  const { setupTestDb } = require('./testDb');
  await setupTestDb();
});

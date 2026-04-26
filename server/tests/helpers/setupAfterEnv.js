const { closeAllQueues } = require('../../queues/index');
const db = require('../../db/index');
const redis = require('../../db/redis');

// Use a global flag to ensure cleanup only runs once (the last afterAll)
// With --runInBand, afterAll runs per file but pool/redis are singletons
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

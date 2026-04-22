const Bull = require('bull');

const redisConfig = {
  redis: process.env.REDIS_URL,
};


const standupScoringQueue = new Bull('standup-scoring', redisConfig);


const prReminderQueue = new Bull('pr-reminders', redisConfig);


const notificationQueue = new Bull('notifications', redisConfig);


[standupScoringQueue, prReminderQueue, notificationQueue].forEach((queue) => {
  queue.on('error', (err) => {
    console.error(`Queue error [${queue.name}]:`, err.message);
  });

  queue.on('failed', (job, err) => {
    console.error(`Job failed [${queue.name}] job ${job.id}:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`Job stalled [${queue.name}] job ${job.id}`);
  });
});

module.exports = { standupScoringQueue, prReminderQueue, notificationQueue };
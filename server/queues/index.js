const { Queue, Worker, QueueEvents } = require("bullmq");

const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};

const standupScoringQueue = new Queue("standup-scoring", { connection });
const prReminderQueue = new Queue("pr-reminders", { connection });
const notificationQueue = new Queue("notifications", { connection });
const closeAllQueues = async () => {
  await standupScoringQueue.close();
  await prReminderQueue.close();
  await notificationQueue.close();
};
module.exports = {
  Queue,
  Worker,
  QueueEvents,
  standupScoringQueue,
  prReminderQueue,
  notificationQueue,
  connection,
  closeAllQueues,
};

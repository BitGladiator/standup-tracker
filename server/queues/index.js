const { Queue, Worker, QueueEvents } = require("bullmq");

const connection = {
  host: new URL(process.env.REDIS_URL || "redis://localhost:6379").hostname,
  port:
    parseInt(new URL(process.env.REDIS_URL || "redis://localhost:6379").port) ||
    6379,
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

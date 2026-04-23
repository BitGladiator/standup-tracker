const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { standupScoringQueue, prReminderQueue, notificationQueue } = require('./index');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(standupScoringQueue),
    new BullMQAdapter(prReminderQueue),
    new BullMQAdapter(notificationQueue),
  ],
  serverAdapter,
});

module.exports = serverAdapter;
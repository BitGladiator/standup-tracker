const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { standupScoringQueue, prReminderQueue, notificationQueue } = require('./index');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(standupScoringQueue),
    new BullAdapter(prReminderQueue),
    new BullAdapter(notificationQueue),
  ],
  serverAdapter,
});

module.exports = serverAdapter;
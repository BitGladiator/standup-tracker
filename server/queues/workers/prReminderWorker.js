const { prReminderQueue } = require('../index');
const { runPRReminders } = require('../../services/prReminderService');
const logger = require('../../observability/logger');
const { cronJobExecutions } = require('../../observability/metrics');
const { emitToUser } = require('./socketEmitter');
prReminderQueue.process(1, async (job) => {
  logger.info('Processing PR reminder job', { jobId: job.id });

  try {
    await emitToUser(io, user.id, 'notifications', newReminders);
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'success' });
    logger.info('PR reminder job completed', { jobId: job.id });
  } catch (err) {
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'failure' });
    logger.error('PR reminder job failed', { jobId: job.id, error: err.message });
    throw err;
  }
});

logger.info('PR reminder worker started');
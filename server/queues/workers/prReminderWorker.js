const { Worker } = require('bullmq');
const { runPRReminders } = require('../../services/prReminderService');
const logger = require('../../observability/logger');
const { cronJobExecutions } = require('../../observability/metrics');
const { connection } = require('../index');

const worker = new Worker('pr-reminders', async (job) => {
  logger.info('Processing PR reminder job', { jobId: job.id });

  try {
    const globalIo = require('../../index').io;
    await runPRReminders(globalIo);
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'success' });
    logger.info('PR reminder job completed', { jobId: job.id });
  } catch (err) {
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'failure' });
    logger.error('PR reminder job failed', { jobId: job.id, error: err.message });
    throw err;
  }
}, { connection, concurrency: 1 });

worker.on('failed', (job, err) => {
  logger.error('PR reminder job failed permanently', { jobId: job.id, error: err.message });
});

logger.info('PR reminder worker started');
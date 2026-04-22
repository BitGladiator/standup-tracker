const { standupScoringQueue } = require('../index');
const { scoreStandup } = require('../../services/standupScorer');
const db = require('../../db');
const logger = require('../../observability/logger');
const { scoringDuration, cronJobExecutions } = require('../../observability/metrics');


// 2 standups can be scored simultaneously
standupScoringQueue.process(2, async (job) => {
  const { standup, userId, io } = job.data;

  logger.info('Processing standup scoring job', {
    jobId: job.id,
    standupId: standup.id,
    userId,
  });

  const end = scoringDuration.startTimer();

  try {
    await job.progress(10);

    const score = await scoreStandup(standup);
    await job.progress(70);

    const { rows } = await db.query(
      `INSERT INTO standup_scores (
        user_id, standup_id, overall_score, grade,
        clarity_score, specificity_score, blocker_quality_score, completeness_score,
        clarity_feedback, specificity_feedback, blocker_feedback,
        completeness_feedback, overall_feedback
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        userId, standup.id, score.overall_score, score.grade,
        score.clarity_score, score.specificity_score,
        score.blocker_quality_score, score.completeness_score,
        score.clarity_feedback, score.specificity_feedback,
        score.blocker_feedback, score.completeness_feedback,
        score.overall_feedback,
      ]
    );

    await job.progress(90);


    const globalIo = require('../../index').io;
    if (globalIo) {
      globalIo.to(`user:${userId}`).emit('standup_score', rows[0]);
    }

    end();
    await job.progress(100);

    logger.info('Standup scoring job completed', {
      jobId: job.id,
      standupId: standup.id,
      score: score.overall_score,
      grade: score.grade,
    });

    cronJobExecutions.inc({ job: 'standup_scoring', status: 'success' });
    return { score: score.overall_score, grade: score.grade };

  } catch (err) {
    end();
    cronJobExecutions.inc({ job: 'standup_scoring', status: 'failure' });
    logger.error('Standup scoring job failed', {
      jobId: job.id,
      standupId: standup.id,
      error: err.message,
    });
    throw err; 
  }
});


standupScoringQueue.on('completed', (job, result) => {
  logger.info('Scoring job completed', { jobId: job.id, result });
});

logger.info('Standup scoring worker started');
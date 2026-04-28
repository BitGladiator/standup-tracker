const { Worker } = require("bullmq");
const { scoreStandup } = require("../../services/standupScorer");
const db = require("../../db");
const logger = require("../../observability/logger");
const {
  scoringDuration,
  cronJobExecutions,
} = require("../../observability/metrics");
const { emitToUser } = require("../../services/socketEmitter");
const { connection } = require("../index");

const worker = new Worker(
  "standup-scoring",
  async (job) => {
    const { standup, userId } = job.data;

    logger.info("Processing standup scoring job", {
      jobId: job.id,
      standupId: standup.id,
      userId,
    });

    const end = scoringDuration.startTimer();

    try {
      await job.updateProgress(10);

      const score = await scoreStandup(standup);
      await job.updateProgress(70);

      const { rows } = await db.query(
        `INSERT INTO standup_scores (
    user_id, standup_id, overall_score, grade,
    clarity_score, specificity_score, blocker_quality_score, completeness_score,
    clarity_feedback, specificity_feedback, blocker_feedback,
    completeness_feedback, overall_feedback,
    strengths, improvements, agent_reasoning, pipeline_meta
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  ON CONFLICT (standup_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    grade = EXCLUDED.grade,
    clarity_score = EXCLUDED.clarity_score,
    specificity_score = EXCLUDED.specificity_score,
    blocker_quality_score = EXCLUDED.blocker_quality_score,
    completeness_score = EXCLUDED.completeness_score,
    clarity_feedback = EXCLUDED.clarity_feedback,
    specificity_feedback = EXCLUDED.specificity_feedback,
    blocker_feedback = EXCLUDED.blocker_feedback,
    completeness_feedback = EXCLUDED.completeness_feedback,
    overall_feedback = EXCLUDED.overall_feedback,
    strengths = EXCLUDED.strengths,
    improvements = EXCLUDED.improvements,
    agent_reasoning = EXCLUDED.agent_reasoning,
    pipeline_meta = EXCLUDED.pipeline_meta,
    created_at = NOW()
  RETURNING *`,
        [
          userId,
          standup.id,
          score.overall_score,
          score.grade,
          score.clarity_score,
          score.specificity_score,
          score.blocker_quality_score,
          score.completeness_score,
          score.clarity_feedback,
          score.specificity_feedback,
          score.blocker_feedback,
          score.completeness_feedback,
          score.overall_feedback,
          JSON.stringify(score.strengths || []),
          JSON.stringify(score.improvements || []),
          JSON.stringify(score.agent_reasoning || {}),
          JSON.stringify(score.pipeline_meta || {}),
        ]
      );

      await job.updateProgress(90);

      const globalIo = require("../../index").io;
      if (globalIo) {
        await emitToUser(globalIo, userId, "standup_score", rows[0]);
      }

      end();
      await job.updateProgress(100);

      logger.info("Standup scoring job completed", {
        jobId: job.id,
        standupId: standup.id,
        score: score.overall_score,
        grade: score.grade,
      });

      cronJobExecutions.inc({ job: "standup_scoring", status: "success" });
      return { score: score.overall_score, grade: score.grade };
    } catch (err) {
      end();
      cronJobExecutions.inc({ job: "standup_scoring", status: "failure" });
      logger.error("Standup scoring job failed", {
        jobId: job.id,
        standupId: standup.id,
        error: err.message,
      });
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job, result) => {
  logger.info("Scoring job completed", { jobId: job.id, result });
});

worker.on("failed", (job, err) => {
  logger.error("Scoring job failed permanently", {
    jobId: job.id,
    error: err.message,
  });
});

logger.info("Standup scoring worker started");

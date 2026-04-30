const { runScoringPipeline } = require('../agents/orchestrator');
const logger = require('../observability/logger');

const scoreStandup = async (standup, userId) => {
  logger.info('Scoring standup via full agentic pipeline', {
    standupId: standup.id,
    userId,
  });
  return runScoringPipeline(standup, userId);
};

module.exports = { scoreStandup };
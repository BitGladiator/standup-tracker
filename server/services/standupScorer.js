const { runScoringPipeline } = require('../agents/orchestrator');
const logger = require('../observability/logger');

const scoreStandup = async (standup) => {
  logger.info('Scoring standup via multi-agent pipeline', {
    standupId: standup.id,
  });

  const result = await runScoringPipeline(standup);
  return result;
};

module.exports = { scoreStandup };
const db = require('../db');
const redis = require('../db/redis');
const logger = require('../observability/logger');


const getPastStandups = async (userId, limit = 5) => {
  const cacheKey = `tool:past_standups:${userId}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await db.query(
    `SELECT s.date, s.yesterday, s.today, s.blockers,
            ss.overall_score, ss.grade,
            ss.clarity_score, ss.specificity_score,
            ss.blocker_quality_score, ss.completeness_score
     FROM standups s
     LEFT JOIN standup_scores ss ON ss.standup_id = s.id
     WHERE s.user_id = $1
     ORDER BY s.date DESC
     LIMIT $2`,
    [userId, limit]
  );

  await redis.setex(cacheKey, 300, JSON.stringify(rows)); 
  return rows;
};


const getUserBaseline = async (userId) => {
  const cacheKey = `tool:baseline:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { rows } = await db.query(
    `SELECT
       ROUND(AVG(overall_score)) as avg_overall,
       ROUND(AVG(clarity_score)) as avg_clarity,
       ROUND(AVG(specificity_score)) as avg_specificity,
       ROUND(AVG(blocker_quality_score)) as avg_blocker,
       ROUND(AVG(completeness_score)) as avg_completeness,
       COUNT(*) as total_scored,
       MAX(overall_score) as best_score,
       MIN(overall_score) as worst_score
     FROM standup_scores
     WHERE user_id = $1`,
    [userId]
  );

  const baseline = rows[0];
  await redis.setex(cacheKey, 600, JSON.stringify(baseline));
  return baseline;
};


const getScoreTrend = async (userId, days = 7) => {
  const { rows } = await db.query(
    `SELECT ss.overall_score, s.date
     FROM standup_scores ss
     JOIN standups s ON s.id = ss.standup_id
     WHERE ss.user_id = $1
       AND s.date >= NOW() - INTERVAL '${days} days'
     ORDER BY s.date ASC`,
    [userId]
  );

  if (rows.length < 2) return { trend: 'insufficient_data', scores: rows };

  const first = parseInt(rows[0].overall_score);
  const last = parseInt(rows[rows.length - 1].overall_score);
  const diff = last - first;

  return {
    trend: diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable',
    change: diff,
    scores: rows.map((r) => ({ date: r.date, score: r.overall_score })),
  };
};

const getGithubActivitySummary = async (userId) => {
  const cacheKey = `github_activity:${userId}`;
  const cached = await redis.get(cacheKey);
  if (!cached) return null;

  const activity = JSON.parse(cached);
  return {
    commits_count: activity.commits?.length || 0,
    prs_count: activity.prs?.length || 0,
    reviews_count: activity.reviews?.length || 0,
    repos_touched: [...new Set(activity.commits?.map((c) => c.repo) || [])],
    has_stale_prs: activity.prs?.some((pr) => {
      const updatedAt = new Date(pr.updatedAt);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      return updatedAt < twoDaysAgo;
    }),
  };
};


const getAgentMemory = async (userId, memoryType) => {
  const { rows } = await db.query(
    'SELECT content FROM agent_memory WHERE user_id = $1 AND memory_type = $2',
    [userId, memoryType]
  );
  return rows[0]?.content || null;
};


const saveAgentMemory = async (userId, memoryType, content) => {
  await db.query(
    `INSERT INTO agent_memory (user_id, memory_type, content, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, memory_type)
     DO UPDATE SET content = $3, updated_at = NOW()`,
    [userId, memoryType, JSON.stringify(content)]
  );
};


const logToolCall = async (userId, standupId, agentName, toolName, input, output, durationMs) => {
  try {
    await db.query(
      `INSERT INTO agent_tool_calls
         (user_id, standup_id, agent_name, tool_name, tool_input, tool_output, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId, standupId, agentName, toolName,
        JSON.stringify(input), JSON.stringify(output), durationMs,
      ]
    );
  } catch (err) {
    logger.error('Failed to log tool call', { error: err.message });
  }
};


const executeTool = async (toolName, args, context = {}) => {
  const start = Date.now();
  let result;

  logger.debug('Executing tool', { toolName, args });

  switch (toolName) {
    case 'get_past_standups':
      result = await getPastStandups(args.userId, args.limit);
      break;
    case 'get_user_baseline':
      result = await getUserBaseline(args.userId);
      break;
    case 'get_score_trend':
      result = await getScoreTrend(args.userId, args.days);
      break;
    case 'get_github_activity':
      result = await getGithubActivitySummary(args.userId);
      break;
    case 'get_agent_memory':
      result = await getAgentMemory(args.userId, args.memoryType);
      break;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }

  const duration = Date.now() - start;

  if (context.userId && context.standupId) {
    await logToolCall(
      context.userId, context.standupId,
      context.agentName || 'unknown', toolName,
      args, result, duration
    );
  }

  return result;
};

module.exports = {
  executeTool,
  saveAgentMemory,
  getAgentMemory,
  AVAILABLE_TOOLS: [
    {
      name: 'get_past_standups',
      description: 'Get the last N standups with their scores for this user',
      parameters: { userId: 'number', limit: 'number (optional, default 5)' },
    },
    {
      name: 'get_user_baseline',
      description: 'Get the user average scores across all time',
      parameters: { userId: 'number' },
    },
    {
      name: 'get_score_trend',
      description: 'Get whether scores are improving, declining or stable',
      parameters: { userId: 'number', days: 'number (optional, default 7)' },
    },
    {
      name: 'get_github_activity',
      description: 'Get recent GitHub activity summary for context',
      parameters: { userId: 'number' },
    },
  ],
};
const { runAgent, MODELS } = require('./agentRunner');
const { executeTool, AVAILABLE_TOOLS } = require('./tools');
const logger = require('../observability/logger');

const PLANNER_PROMPT = `You are an intelligent orchestrator for a standup quality assessment system.
Your job is to analyse a developer standup and create an execution plan for specialist agents.

You have access to tools that give you context about the user's history.
Use them to make the plan more personalized and accurate.

Available tools:
${AVAILABLE_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

Based on the standup content and user history, output a JSON execution plan:
{
  "observations": "<2-3 sentences about what you notice about this standup>",
  "context_gathered": {
    "has_history": <boolean>,
    "trend": "<improving|declining|stable|insufficient_data>",
    "baseline_overall": <number or null>,
    "recurring_issues": ["<issue1>", "<issue2>"]
  },
  "agent_instructions": {
    "clarity": {
      "priority": "<high|normal|low>",
      "focus_hint": "<specific thing to focus on, or null>"
    },
    "specificity": {
      "priority": "<high|normal|low>",
      "focus_hint": "<specific thing to focus on, or null>"
    },
    "blocker_quality": {
      "priority": "<high|normal|low>",
      "focus_hint": "<specific thing to focus on, or null>"
    },
    "completeness": {
      "priority": "<high|normal|low>",
      "focus_hint": "<specific thing to focus on, or null>"
    }
  },
  "memory_context": "<1-2 sentences summarising relevant history to inject into agents, or null>"
}`;

const buildPlannerContent = (standup, tools) =>
  `STANDUP TO ANALYSE:
Yesterday: ${standup.yesterday || 'Not filled'}
Today: ${standup.today || 'Not filled'}
Blockers: ${standup.blockers || 'Not filled'}

TOOL RESULTS:
${tools.map((t) => `[${t.tool}]\n${JSON.stringify(t.result, null, 2)}`).join('\n\n')}`;

const runPlanner = async (standup, userId) => {
  logger.info('Planner gathering context via tools', { standupId: standup.id });

  const [pastStandups, baseline, trend, githubActivity] = await Promise.all([
    executeTool('get_past_standups', { userId, limit: 5 }, { agentName: 'planner', standupId: standup.id, userId }),
    executeTool('get_user_baseline', { userId }, { agentName: 'planner', standupId: standup.id, userId }),
    executeTool('get_score_trend', { userId, days: 14 }, { agentName: 'planner', standupId: standup.id, userId }),
    executeTool('get_github_activity', { userId }, { agentName: 'planner', standupId: standup.id, userId }),
  ]);

  const toolResults = [
    { tool: 'past_standups', result: pastStandups },
    { tool: 'user_baseline', result: baseline },
    { tool: 'score_trend', result: trend },
    { tool: 'github_activity', result: githubActivity },
  ];

  const plannerContent = buildPlannerContent(standup, toolResults);

  const planResult = await runAgent(
    'planner',
    PLANNER_PROMPT,
    plannerContent,
    { model: MODELS.smart, temperature: 0.1, maxTokens: 600 }
  );

  if (!planResult.success) {
    logger.warn('Planner failed — using default plan');
    return {
      plan: null,
      toolResults,
      defaultPlan: true,
    };
  }

  logger.info('Planner produced execution plan', {
    observations: planResult.output?.observations,
    trend: planResult.output?.context_gathered?.trend,
  });

  return {
    plan: planResult.output,
    toolResults,
    defaultPlan: false,
  };
};

module.exports = { runPlanner };
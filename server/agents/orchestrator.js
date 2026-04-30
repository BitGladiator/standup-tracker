const { runAgent, MODELS } = require('./agentRunner');
const { AGENT_PROMPTS, buildAgentPrompt } = require('./prompts');
const { runPlanner } = require('./planner');
const { executeTool, saveAgentMemory } = require('./tools');
const logger = require('../observability/logger');

const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    active--;
    if (queue.length > 0) queue.shift()();
  };
  return async (fn) => {
    if (active >= concurrency) await new Promise(resolve => queue.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
};

const limit = pLimit(4);

const buildStandupContent = (standup) => `
Yesterday: ${standup.yesterday || 'Not filled'}
Today: ${standup.today || 'Not filled'}
Blockers: ${standup.blockers || 'Not filled'}
`.trim();

const buildCriticContent = (standup, agentResults, plannerOutput) => `
ORIGINAL STANDUP:
${buildStandupContent(standup)}

${plannerOutput?.memory_context
  ? `USER HISTORY CONTEXT:\n${plannerOutput.memory_context}\n`
  : ''}

${plannerOutput?.context_gathered?.trend
  ? `SCORE TREND: ${plannerOutput.context_gathered.trend}\n`
  : ''}

AGENT ASSESSMENTS:
${agentResults.map((r) => `
[${r.agent.toUpperCase()} AGENT — Priority: ${plannerOutput?.agent_instructions?.[r.agent]?.priority || 'normal'}]
Score: ${r.output?.score ?? 'N/A'}/25
Reasoning: ${r.output?.reasoning ?? 'N/A'}
Main issue: ${r.output?.main_issue ?? 'None'}
Suggestion: ${r.output?.suggestion ?? 'N/A'}
`).join('\n---\n')}
`.trim();

const runScoringPipeline = async (standup, userId) => {
  const pipelineStart = Date.now();

  logger.info('Starting full agentic scoring pipeline', {
    standupId: standup.id,
    userId,
  });

  
  logger.info('Phase 1 — Planner running');
  const { plan, toolResults, defaultPlan } = await runPlanner(standup, userId);

  logger.info('Phase 2 — Specialist agents running in parallel');

  const standupContent = buildStandupContent(standup);

  const agentConfigs = [
    { name: 'clarity',         prompt: AGENT_PROMPTS.clarity },
    { name: 'specificity',     prompt: AGENT_PROMPTS.specificity },
    { name: 'blocker_quality', prompt: AGENT_PROMPTS.blocker_quality },
    { name: 'completeness',    prompt: AGENT_PROMPTS.completeness },
  ];

  const agentResults = await Promise.all(
    agentConfigs.map(({ name, prompt }) =>
      limit(() => runAgent(
        name,
        buildAgentPrompt(name, prompt, plan),
        standupContent
      ))
    )
  );

  const resolvedResults = agentResults.map((result) => {
    if (!result.success) {
      return {
        ...result,
        output: { score: 12, reasoning: 'Agent failed — fallback score applied', main_issue: null, suggestion: null },
      };
    }
    return result;
  });

  logger.info('Phase 3 — Critic reviewing and reflecting');

  const criticContent = buildCriticContent(standup, resolvedResults, plan);
  const criticResult = await runAgent(
    'critic',
    AGENT_PROMPTS.critic,
    criticContent,
    { model: MODELS.smart, temperature: 0.15, maxTokens: 700 }
  );

  const agentScores = {
    clarity:         resolvedResults.find((r) => r.agent === 'clarity')?.output?.score ?? 12,
    specificity:     resolvedResults.find((r) => r.agent === 'specificity')?.output?.score ?? 12,
    blocker_quality: resolvedResults.find((r) => r.agent === 'blocker_quality')?.output?.score ?? 12,
    completeness:    resolvedResults.find((r) => r.agent === 'completeness')?.output?.score ?? 12,
  };

  let finalScores = { ...agentScores };
  if (criticResult.success && criticResult.output?.adjustments) {
    criticResult.output.adjustments.forEach((adj) => {
      if (adj.adjusted_score !== adj.original_score) {
        finalScores[adj.dimension] = adj.adjusted_score;
      }
    });
  }

  const rawTotal = Object.values(finalScores).reduce((s, v) => s + v, 0);
  const overallScore = criticResult.success
    ? (criticResult.output?.overall_score ?? rawTotal)
    : rawTotal;

  const grade =
    overallScore >= 85 ? 'A' :
    overallScore >= 70 ? 'B' :
    overallScore >= 50 ? 'C' : 'D';

  logger.info('Phase 5 — Updating agent memory');

  const recurringIssues = plan?.context_gathered?.recurring_issues || [];

  
  const lowDimensions = Object.entries(finalScores)
    .filter(([, score]) => score < 15)
    .map(([dim]) => dim);

 
  const updatedIssues = [...new Set([...recurringIssues, ...lowDimensions])].slice(0, 5);

  await saveAgentMemory(userId, 'scoring_patterns', {
    last_score: overallScore,
    last_grade: grade,
    recurring_issues: updatedIssues,
    total_runs: (plan?.context_gathered?.total_runs || 0) + 1,
    last_run: new Date().toISOString(),
  });

  const totalTokens = [...agentResults, criticResult].reduce(
    (s, r) => s + (r.tokensUsed || 0), 0
  );

  const pipelineDuration = Date.now() - pipelineStart;

  logger.info('Agentic scoring pipeline complete', {
    standupId: standup.id,
    overallScore,
    grade,
    totalTokens,
    pipelineDurationMs: pipelineDuration,
    usedPlanner: !defaultPlan,
    recurringIssues: updatedIssues,
  });

  return {
    overall_score: Math.min(100, Math.max(0, overallScore)),
    grade,
    clarity_score:         Math.min(25, Math.max(0, finalScores.clarity)),
    specificity_score:     Math.min(25, Math.max(0, finalScores.specificity)),
    blocker_quality_score: Math.min(25, Math.max(0, finalScores.blocker_quality)),
    completeness_score:    Math.min(25, Math.max(0, finalScores.completeness)),
    clarity_feedback:         resolvedResults.find((r) => r.agent === 'clarity')?.output?.suggestion,
    specificity_feedback:     resolvedResults.find((r) => r.agent === 'specificity')?.output?.suggestion,
    blocker_feedback:         resolvedResults.find((r) => r.agent === 'blocker_quality')?.output?.suggestion,
    completeness_feedback:    resolvedResults.find((r) => r.agent === 'completeness')?.output?.suggestion,
    overall_feedback:         criticResult.success ? criticResult.output?.overall_feedback : 'Score computed from specialist agents.',
    strengths:                criticResult.success ? (criticResult.output?.strengths    ?? []) : [],
    improvements:             criticResult.success ? (criticResult.output?.improvements ?? []) : [],
    planner_observations:     plan?.observations || null,
    recurring_issues:         updatedIssues,
    agent_reasoning: {
      clarity:              resolvedResults.find((r) => r.agent === 'clarity')?.output?.reasoning,
      specificity:          resolvedResults.find((r) => r.agent === 'specificity')?.output?.reasoning,
      blocker_quality:      resolvedResults.find((r) => r.agent === 'blocker_quality')?.output?.reasoning,
      completeness:         resolvedResults.find((r) => r.agent === 'completeness')?.output?.reasoning,
      critic_adjustments:   criticResult.output?.adjustments ?? [],
      planner_plan:         plan,
    },
    pipeline_meta: {
      total_tokens:      totalTokens,
      duration_ms:       pipelineDuration,
      agents_succeeded:  agentResults.filter((r) => r.success).length,
      agents_total:      agentConfigs.length,
      critic_succeeded:  criticResult.success,
      planner_used:      !defaultPlan,
      memory_updated:    true,
    },
  };
};

module.exports = { runScoringPipeline };
const { runAgent, MODELS } = require('./agentRunner');
const { AGENT_PROMPTS } = require('./prompts');
const logger = require('../observability/logger');

const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = queue.shift();
      fn().then(resolve, reject).finally(() => {
        active--;
        next();
      });
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

const limit = pLimit(4);

const buildStandupContent = (standup) => `
Yesterday:
${standup.yesterday || 'Not filled'}

Today:
${standup.today || 'Not filled'}

Blockers:
${standup.blockers || 'Not filled'}
`.trim();

const buildCriticContent = (standup, agentResults) => `
ORIGINAL STANDUP:
${buildStandupContent(standup)}

AGENT ASSESSMENTS:
${agentResults.map((r) => `
[${r.agent.toUpperCase()} AGENT]
Score: ${r.output?.score ?? 'N/A'}/25
Reasoning: ${r.output?.reasoning ?? 'N/A'}
Main issue: ${r.output?.main_issue ?? 'None'}
Suggestion: ${r.output?.suggestion ?? 'N/A'}
`).join('\n---\n')}
`.trim();

const runScoringPipeline = async (standup) => {
  const pipelineStart = Date.now();

  logger.info('Starting multi-agent scoring pipeline', {
    standupId: standup.id,
  });

 
  const agentConfigs = [
    { name: 'clarity',        prompt: AGENT_PROMPTS.clarity },
    { name: 'specificity',    prompt: AGENT_PROMPTS.specificity },
    { name: 'blocker_quality',prompt: AGENT_PROMPTS.blocker_quality },
    { name: 'completeness',   prompt: AGENT_PROMPTS.completeness },
  ];

  const standupContent = buildStandupContent(standup);

  logger.info('Phase 1 — running specialist agents in parallel');

  const agentResults = await Promise.all(
    agentConfigs.map(({ name, prompt }) =>
      limit(() => runAgent(name, prompt, standupContent))
    )
  );

  const resolvedResults = agentResults.map((result) => {
    if (!result.success) {
      logger.warn(`Agent ${result.agent} failed — using fallback score`, {
        error: result.error,
      });
      return {
        ...result,
        output: {
          score: 12, 
          reasoning: 'Agent failed — fallback score applied',
          main_issue: null,
          suggestion: null,
        },
      };
    }
    return result;
  });

  const successfulAgents = resolvedResults.filter((r) => r.success);
  logger.info('Phase 1 complete', {
    total: agentResults.length,
    successful: successfulAgents.length,
    failed: agentResults.length - successfulAgents.length,
  });

  
  logger.info('Phase 2 — critic agent reviewing scores');

  const criticContent = buildCriticContent(standup, resolvedResults);
  const criticResult = await runAgent(
    'critic',
    AGENT_PROMPTS.critic,
    criticContent,
    {
      model: MODELS.smart,
      temperature: 0.15,
      maxTokens: 600,
    }
  );

  if (!criticResult.success) {
    logger.warn('Critic agent failed — computing simple aggregate');
  }

  
  const agentScores = {
    clarity:        resolvedResults.find((r) => r.agent === 'clarity')?.output?.score ?? 12,
    specificity:    resolvedResults.find((r) => r.agent === 'specificity')?.output?.score ?? 12,
    blocker_quality:resolvedResults.find((r) => r.agent === 'blocker_quality')?.output?.score ?? 12,
    completeness:   resolvedResults.find((r) => r.agent === 'completeness')?.output?.score ?? 12,
  };

  
  let finalScores = { ...agentScores };
  if (criticResult.success && criticResult.output?.adjustments) {
    criticResult.output.adjustments.forEach((adj) => {
      if (adj.adjusted_score !== adj.original_score) {
        finalScores[adj.dimension] = adj.adjusted_score;
        logger.info(`Critic adjusted ${adj.dimension}`, {
          from: adj.original_score,
          to: adj.adjusted_score,
          reason: adj.reason,
        });
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

  const totalTokens = [...agentResults, criticResult].reduce(
    (s, r) => s + (r.tokensUsed || 0), 0
  );

  const pipelineDuration = Date.now() - pipelineStart;

  logger.info('Multi-agent scoring pipeline complete', {
    standupId: standup.id,
    overallScore,
    grade,
    totalTokens,
    pipelineDurationMs: pipelineDuration,
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

    
    overall_feedback: criticResult.success
      ? criticResult.output?.overall_feedback
      : 'Score computed from specialist agents.',
    strengths:    criticResult.success ? (criticResult.output?.strengths    ?? []) : [],
    improvements: criticResult.success ? (criticResult.output?.improvements ?? []) : [],

 
    agent_reasoning: {
      clarity:         resolvedResults.find((r) => r.agent === 'clarity')?.output?.reasoning,
      specificity:     resolvedResults.find((r) => r.agent === 'specificity')?.output?.reasoning,
      blocker_quality: resolvedResults.find((r) => r.agent === 'blocker_quality')?.output?.reasoning,
      completeness:    resolvedResults.find((r) => r.agent === 'completeness')?.output?.reasoning,
      critic_adjustments: criticResult.output?.adjustments ?? [],
    },

  
    pipeline_meta: {
      total_tokens: totalTokens,
      duration_ms: pipelineDuration,
      agents_succeeded: successfulAgents.length,
      agents_total: agentConfigs.length,
      critic_succeeded: criticResult.success,
    },
  };
};

module.exports = { runScoringPipeline };
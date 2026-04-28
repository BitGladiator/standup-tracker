const Groq = require('groq-sdk');
const logger = require('../observability/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELS = {
  fast: 'llama-3.1-8b-instant',    
  smart: 'llama-3.3-70b-versatile', 
};

const runAgent = async (agentName, systemPrompt, userContent, options = {}) => {
  const model = options.model || MODELS.fast;
  const startTime = Date.now();

  logger.debug(`Agent [${agentName}] starting`, { model });

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 400,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty response from model');

    const parsed = JSON.parse(raw);
    const duration = Date.now() - startTime;

    logger.debug(`Agent [${agentName}] completed`, {
      duration,
      tokensUsed: response.usage?.total_tokens,
    });

    return {
      agent: agentName,
      success: true,
      output: parsed,
      tokensUsed: response.usage?.total_tokens || 0,
      durationMs: duration,
    };
  } catch (err) {
    logger.error(`Agent [${agentName}] failed`, { error: err.message });
    return {
      agent: agentName,
      success: false,
      error: err.message,
      output: null,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
};

module.exports = { runAgent, MODELS };
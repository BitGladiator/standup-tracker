const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert engineering manager who evaluates daily standup quality.
You will receive a developer's standup and score it across 4 dimensions.
You must respond with ONLY a valid JSON object — no preamble, no markdown, no explanation outside the JSON.

Scoring criteria:

CLARITY (0-25): Is the standup easy to understand for someone outside the team?
- 20-25: Crystal clear, no jargon, anyone can understand
- 10-19: Mostly clear, minor ambiguity
- 0-9: Vague, confusing, or full of unexplained acronyms

SPECIFICITY (0-25): Are tasks concrete and measurable?
- 20-25: Specific tasks, PR numbers, ticket refs, concrete outcomes
- 10-19: Some specifics but also vague items
- 0-9: Generic statements like "worked on stuff", "did some fixes"

BLOCKER_QUALITY (0-25): Are blockers actionable and clearly stated?
- 20-25: Clear blocker with context and what help is needed
- 10-19: Blocker mentioned but lacks context
- 0-9: "None" with obvious stale PRs, or vague complaints
- 25: if genuinely no blockers and standup shows smooth progress

COMPLETENESS (0-25): Are all three sections meaningfully filled?
- 20-25: All sections have substantive content
- 10-19: One section is thin
- 0-9: One or more sections missing or single word

Respond ONLY with this exact JSON structure:
{
  "overall_score": <0-100>,
  "grade": "<A|B|C|D>",
  "clarity_score": <0-25>,
  "specificity_score": <0-25>,
  "blocker_quality_score": <0-25>,
  "completeness_score": <0-25>,
  "clarity_feedback": "<one sentence, max 15 words>",
  "specificity_feedback": "<one sentence, max 15 words>",
  "blocker_feedback": "<one sentence, max 15 words>",
  "completeness_feedback": "<one sentence, max 15 words>",
  "overall_feedback": "<two sentences of actionable advice, max 30 words>"
}

Grade mapping: A = 85-100, B = 70-84, C = 50-69, D = 0-49`;

const scoreStandup = async (standup) => {
  const userMessage = `
Yesterday:
${standup.yesterday || "Not filled"}

Today:
${standup.today || "Not filled"}

Blockers:
${standup.blockers || "Not filled"}
`.trim();

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", 
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1, 
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("No response from Groq");

 
  const parsed = JSON.parse(raw);

  
  const requiredFields = [
    "overall_score",
    "grade",
    "clarity_score",
    "specificity_score",
    "blocker_quality_score",
    "completeness_score",
    "clarity_feedback",
    "specificity_feedback",
    "blocker_feedback",
    "completeness_feedback",
    "overall_feedback",
  ];

  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing field in LLM response: ${field}`);
    }
  }

 
  parsed.overall_score = Math.min(100, Math.max(0, parsed.overall_score));
  parsed.clarity_score = Math.min(25, Math.max(0, parsed.clarity_score));
  parsed.specificity_score = Math.min(
    25,
    Math.max(0, parsed.specificity_score)
  );
  parsed.blocker_quality_score = Math.min(
    25,
    Math.max(0, parsed.blocker_quality_score)
  );
  parsed.completeness_score = Math.min(
    25,
    Math.max(0, parsed.completeness_score)
  );

  return parsed;
};

module.exports = { scoreStandup };

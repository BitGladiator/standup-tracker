exports.up = async (pgm) => {
    pgm.addColumns('standup_scores', {
      strengths: { type: 'jsonb', default: pgm.func("'[]'::jsonb") },
      improvements: { type: 'jsonb', default: pgm.func("'[]'::jsonb") },
      agent_reasoning: { type: 'jsonb' },
      pipeline_meta: { type: 'jsonb' },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropColumns('standup_scores', [
      'strengths',
      'improvements',
      'agent_reasoning',
      'pipeline_meta',
    ]);
  };
exports.up = async (pgm) => {
    pgm.createTable('standup_scores', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      standup_id: {
        type: 'integer',
        references: '"standups"',
        onDelete: 'CASCADE',
      },
      overall_score: { type: 'integer', notNull: true },
      grade: { type: 'varchar(2)', notNull: true },
      clarity_score: { type: 'integer', notNull: true },
      specificity_score: { type: 'integer', notNull: true },
      blocker_quality_score: { type: 'integer', notNull: true },
      completeness_score: { type: 'integer', notNull: true },
      clarity_feedback: { type: 'text' },
      specificity_feedback: { type: 'text' },
      blocker_feedback: { type: 'text' },
      completeness_feedback: { type: 'text' },
      overall_feedback: { type: 'text' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropTable('standup_scores');
  };
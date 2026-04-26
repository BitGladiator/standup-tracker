exports.up = async (pgm) => {
    pgm.createTable('github_activity', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      fetched_at: { type: 'timestamp', default: pgm.func('NOW()') },
      commits: { type: 'jsonb' },
      prs: { type: 'jsonb' },
      reviews: { type: 'jsonb' },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropTable('github_activity');
  };
exports.up = async (pgm) => {
    // Remove duplicate score rows, keeping only the latest per standup_id
    pgm.sql(`
      DELETE FROM standup_scores
      WHERE id NOT IN (
        SELECT DISTINCT ON (standup_id) id
        FROM standup_scores
        ORDER BY standup_id, created_at DESC
      )
    `);

    // Add unique constraint so each standup can only have one score
    pgm.addConstraint('standup_scores', 'standup_scores_standup_id_unique', {
      unique: ['standup_id'],
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropConstraint('standup_scores', 'standup_scores_standup_id_unique');
  };

exports.up = async (pgm) => {
    pgm.createIndex('standups', ['user_id', 'date'], {
      name: 'idx_standups_user_date',
      order: { date: 'DESC' },
    });
  
    pgm.createIndex('focus_sessions', ['user_id', 'started_at'], {
      name: 'idx_focus_sessions_user_started',
      order: { started_at: 'DESC' },
    });
  
    pgm.createIndex('notifications', ['user_id', 'read', 'created_at'], {
      name: 'idx_notifications_user_read',
      order: { created_at: 'DESC' },
    });
  
    pgm.createIndex('github_activity', ['user_id', 'fetched_at'], {
      name: 'idx_github_activity_user',
      order: { fetched_at: 'DESC' },
    });
  
    pgm.createIndex('standup_scores', ['user_id', 'created_at'], {
      name: 'idx_standup_scores_user',
      order: { created_at: 'DESC' },
    });
  
    pgm.createIndex('standup_scores', ['standup_id'], {
      name: 'idx_standup_scores_standup',
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropIndex('standups', [], { name: 'idx_standups_user_date' });
    pgm.dropIndex('focus_sessions', [], { name: 'idx_focus_sessions_user_started' });
    pgm.dropIndex('notifications', [], { name: 'idx_notifications_user_read' });
    pgm.dropIndex('github_activity', [], { name: 'idx_github_activity_user' });
    pgm.dropIndex('standup_scores', [], { name: 'idx_standup_scores_user' });
    pgm.dropIndex('standup_scores', [], { name: 'idx_standup_scores_standup' });
  };
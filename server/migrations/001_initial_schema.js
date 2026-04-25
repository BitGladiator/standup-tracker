exports.up = async (pgm) => {
    pgm.createTable('users', {
      id: { type: 'serial', primaryKey: true },
      github_id: { type: 'varchar(50)', unique: true, notNull: true },
      username: { type: 'varchar(100)', notNull: true },
      avatar_url: { type: 'text' },
      access_token: { type: 'text', notNull: true },
      slack_webhook_url: { type: 'text' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.createTable('standups', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      date: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
      yesterday: { type: 'text' },
      today: { type: 'text' },
      blockers: { type: 'text' },
      auto_generated: { type: 'boolean', default: false },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.addConstraint('standups', 'standups_user_date_unique', 'UNIQUE (user_id, date)');
  
    pgm.createTable('focus_sessions', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      label: { type: 'varchar(255)' },
      started_at: { type: 'timestamp', notNull: true },
      ended_at: { type: 'timestamp', notNull: true },
      duration_minutes: { type: 'integer', notNull: true },
      pomodoro_count: { type: 'integer', default: 1 },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropTable('focus_sessions');
    pgm.dropTable('standups');
    pgm.dropTable('users');
  };
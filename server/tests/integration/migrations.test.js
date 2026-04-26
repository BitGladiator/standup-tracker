const db = require('../../db');

describe('Database schema integrity', () => {
  const expectedTables = [
    'users',
    'standups',
    'focus_sessions',
    'github_activity',
    'standup_scores',
    'notifications',
    'journals',
  ];

  test('all expected tables exist', async () => {
    const { rows } = await db.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tableNames = rows.map((r) => r.tablename);
    expectedTables.forEach((table) => {
      expect(tableNames).toContain(table);
    });
  });

  test('pgmigrations table has all migrations recorded', async () => {
    const { rows: tableCheck } = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'pgmigrations'
      ) AS exists
    `);

    if (!tableCheck[0].exists) {
      console.warn('pgmigrations table not found — skipping migration record check');
      return;
    }

    const { rows } = await db.query(
      'SELECT name FROM pgmigrations ORDER BY run_on'
    );
    const names = rows.map((r) => r.name);

    expect(names).toContain('001_initial_schema');
    expect(names).toContain('002_add_github_activity');
    expect(names).toContain('003_add_standup_scores');
    expect(names).toContain('004_add_notifications');
    expect(names).toContain('005_add_indexes');
    expect(names).toContain('006_add_journal_entries');
  });

  test('users table has correct columns', async () => {
    const { rows } = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY column_name
    `);
    const columns = rows.map((r) => r.column_name);

    expect(columns).toContain('id');
    expect(columns).toContain('github_id');
    expect(columns).toContain('username');
    expect(columns).toContain('access_token');
    expect(columns).toContain('slack_webhook_url');
  });

  test('indexes exist on hot query paths', async () => {
    const { rows } = await db.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);
    const indexes = rows.map((r) => r.indexname);

    expect(indexes).toContain('idx_standups_user_date');
    expect(indexes).toContain('idx_focus_sessions_user_started');
    expect(indexes).toContain('idx_notifications_user_read');
    expect(indexes).toContain('idx_standup_scores_user');
  });
});
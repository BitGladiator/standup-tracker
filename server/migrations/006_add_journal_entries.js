exports.up = async (pgm) => {
    pgm.createTable('journal_entries', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      date: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
      content: { type: 'text', notNull: true },
      mood: { type: 'varchar(20)' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
      updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.addConstraint(
      'journal_entries',
      'journal_entries_user_date_unique',
      'UNIQUE (user_id, date)'
    );
  
    pgm.createIndex('journal_entries', ['user_id', 'date'], {
      name: 'idx_journal_entries_user_date',
      order: { date: 'DESC' },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropIndex('journal_entries', [], { name: 'idx_journal_entries_user_date' });
    pgm.dropTable('journal_entries');
  };
exports.up = async (pgm) => {
    pgm.createTable('journals', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      date: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
      problems_solved: { type: 'text' },
      how_it_was_done: { type: 'text' },
      notes: { type: 'text' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
      updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.addConstraint(
      'journals',
      'journals_user_id_date_key',
      'UNIQUE (user_id, date)'
    );
  
    pgm.createIndex('journals', ['user_id', 'date'], {
      name: 'idx_journals_user_date',
      order: { date: 'DESC' },
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropIndex('journals', [], { name: 'idx_journals_user_date' });
    pgm.dropTable('journals');
  };
exports.up = async (pgm) => {
    pgm.createTable('agent_memory', {
      id: { type: 'serial', primaryKey: true },
      user_id: {
        type: 'integer',
        references: '"users"',
        onDelete: 'CASCADE',
      },
      memory_type: { type: 'varchar(50)', notNull: true },
      content: { type: 'jsonb', notNull: true },
      updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.addConstraint(
      'agent_memory',
      'agent_memory_user_type_unique',
      'UNIQUE (user_id, memory_type)'
    );
  

    pgm.createTable('agent_tool_calls', {
      id: { type: 'serial', primaryKey: true },
      user_id: { type: 'integer', references: '"users"', onDelete: 'CASCADE' },
      standup_id: { type: 'integer', references: '"standups"', onDelete: 'CASCADE' },
      agent_name: { type: 'varchar(50)', notNull: true },
      tool_name: { type: 'varchar(50)', notNull: true },
      tool_input: { type: 'jsonb' },
      tool_output: { type: 'jsonb' },
      duration_ms: { type: 'integer' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });
  
    pgm.createIndex('agent_memory', ['user_id', 'memory_type'], {
      name: 'idx_agent_memory_user_type',
    });
  
    pgm.createIndex('agent_tool_calls', ['user_id', 'standup_id'], {
      name: 'idx_tool_calls_user_standup',
    });
  };
  
  exports.down = async (pgm) => {
    pgm.dropTable('agent_tool_calls');
    pgm.dropTable('agent_memory');
  };
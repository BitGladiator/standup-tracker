exports.up = async (pgm) => {
  pgm.createTable('notifications', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'CASCADE',
    },
    type: { type: 'varchar(50)', notNull: true },
    title: { type: 'varchar(255)', notNull: true },
    body: { type: 'text' },
    pr_url: { type: 'text' },
    pr_title: { type: 'text' },
    repo: { type: 'varchar(255)' },
    read: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('notifications');
};
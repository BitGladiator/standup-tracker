const { Pool } = require('pg');
const { dbQueryDuration } = require('../observability/metrics');
const logger = require('../observability/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  keepAlive: true,
});

pool.on('connect', () => logger.debug('New DB connection established'));
pool.on('error', (err) => {
  logger.error('Unexpected DB error', { error: err.message });
  process.exit(-1);
});


const query = async (text, params, queryName = 'unknown') => {
  const end = dbQueryDuration.startTimer({ query_name: queryName });
  try {
    const result = await pool.query(text, params);
    end();
    return result;
  } catch (err) {
    end();
    logger.error('DB query failed', {
      queryName,
      error: err.message,
      query: text.substring(0, 100),
    });
    throw err;
  }
};

const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
});

module.exports = { query, getPoolStats, getClient: () => pool.connect(), end: () => pool.end() };
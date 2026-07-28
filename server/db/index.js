const { Pool } = require('pg');
const { dbQueryDuration } = require('../observability/metrics');
const logger = require('../observability/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
});

pool.on('connect', () => logger.debug('New DB connection established'));
pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message });
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
const end = () => pool.end();
module.exports = { query, getPoolStats, getClient: () => pool.connect(), end };
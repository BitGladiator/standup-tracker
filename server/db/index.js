const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,

  idleTimeoutMillis: 30000,

  
  connectionTimeoutMillis: 2000,


  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', () => {
  console.log('New DB connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
  process.exit(-1);
});


const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPoolStats,
 
  getClient: () => pool.connect(),
};
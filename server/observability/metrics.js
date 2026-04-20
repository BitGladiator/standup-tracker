const promClient = require('prom-client');


const register = new promClient.Registry();


promClient.collectDefaultMetrics({
  register,
  prefix: 'standup_tracker_',
});



const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});


const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});


const httpErrorTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});


const activeWebSocketConnections = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});


const githubApiCalls = new promClient.Counter({
  name: 'github_api_calls_total',
  help: 'Total GitHub API calls made',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});


const githubApiDuration = new promClient.Histogram({
  name: 'github_api_duration_seconds',
  help: 'Duration of GitHub API calls',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});


const cacheOperations = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Redis cache hits and misses',
  labelNames: ['operation', 'result'], 
  registers: [register],
});


const standupOperations = new promClient.Counter({
  name: 'standup_operations_total',
  help: 'Standup saves and generations',
  labelNames: ['operation'], 
  registers: [register],
});


const scoringDuration = new promClient.Histogram({
  name: 'standup_scoring_duration_seconds',
  help: 'Time taken to score a standup via Groq',
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});


const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_name'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});


const cronJobExecutions = new promClient.Counter({
  name: 'cron_job_executions_total',
  help: 'Total cron job executions',
  labelNames: ['job', 'status'],
  registers: [register],
});


const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Number of rate limit violations',
  labelNames: ['limiter'], 
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  httpErrorTotal,
  activeWebSocketConnections,
  githubApiCalls,
  githubApiDuration,
  cacheOperations,
  standupOperations,
  scoringDuration,
  dbQueryDuration,
  cronJobExecutions,
  rateLimitHits,
};
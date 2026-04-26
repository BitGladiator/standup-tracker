require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { execSync } = require('child_process');
const { securityHeaders, compress } = require('./middleware/security');
const { globalLimiter, authLimiter, githubLimiter, speedLimiter } = require('./middleware/rateLimiter');
const requestMetrics = require('./middleware/requestMetrics');
const logger = require('./observability/logger');
const { register, activeWebSocketConnections, cronJobExecutions } = require('./observability/metrics');
const { getPoolStats } = require('./db/index');
const bullBoardAdapter = require('./queues/bullBoard');
const { prReminderQueue } = require('./queues/index');
const { getBufferedEvents, clearBufferedEvents } = require('./services/eventBuffer');


require('./queues/workers/standupScoringWorker');
require('./queues/workers/prReminderWorker');

const authRoutes = require('./routes/auth');
const standupRoutes = require('./routes/standup');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const heatmapRoutes = require('./routes/heatmap');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 20000,
  pingInterval: 25000,
});


module.exports.io = io;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
].filter(Boolean);

app.use(securityHeaders);
app.use(compress);
app.use(requestMetrics);
app.use(globalLimiter);
app.use(speedLimiter);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.set('io', io);


app.use('/admin/queues', bullBoardAdapter.getRouter());

io.on('connection', (socket) => {
  activeWebSocketConnections.inc();

  socket.on('join', async (userId) => {
    socket.join(`user:${userId}`);
    logger.debug('User joined room', { userId });


    try {
      const missed = await getBufferedEvents(userId);
      if (missed.length > 0) {
        logger.info('Replaying missed events', { userId, count: missed.length });
        missed.forEach(({ event, data }) => {
          socket.emit(event, data);
        });
       
        await clearBufferedEvents(userId);
      }
    } catch (err) {
      logger.error('Failed to replay events', { userId, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    activeWebSocketConnections.dec();
  });
});
const runMigrations = () => {
  try {
    logger.info('Running database migrations...');
    execSync('npm run migrate:up', {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env },
    });
    logger.info('Migrations completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1); 
  }
};
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/standup', standupRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/standup/generate', githubLimiter);

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/health', async (req, res) => {
  const pool = getPoolStats();
  const [scoringCounts, reminderCounts] = await Promise.all([
    require('./queues/index').standupScoringQueue.getJobCounts(),
    require('./queues/index').prReminderQueue.getJobCounts(),
  ]);

  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    db: pool,
    queues: {
      scoring: scoringCounts,
      reminders: reminderCounts,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, requestId: req.id });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    requestId: req.id,
  });
});


cron.schedule('0 9 * * *', async () => {
  const job = await prReminderQueue.add(
    'daily-pr-check',
    {},
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 10,
      removeOnFail: 20,
    }
  );
  logger.info('PR reminder job scheduled', { jobId: job.id });
});

app.post('/api/notifications/trigger-check', async (req, res) => {
  const job = await prReminderQueue.add({}, { attempts: 1 });
  res.json({ success: true, jobId: job.id });
});
runMigrations();
const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () =>
  logger.info('Server started', { port: PORT })
);
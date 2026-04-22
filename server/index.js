require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const { securityHeaders, compress } = require('./middleware/security');
const { globalLimiter, authLimiter, githubLimiter, speedLimiter } = require('./middleware/rateLimiter');
const requestMetrics = require('./middleware/requestMetrics');
const logger = require('./observability/logger');
const { register, activeWebSocketConnections, cronJobExecutions } = require('./observability/metrics');
const { getPoolStats } = require('./db/index');

const authRoutes = require('./routes/auth');
const standupRoutes = require('./routes/standup');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const heatmapRoutes = require('./routes/heatmap');
const { standupScoringQueue } = require('../queues/index');
const { runPRReminders } = require('./services/prReminderService');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
  transports: ['websocket'],
  pingTimeout: 20000,
  pingInterval: 25000,
});


app.use(securityHeaders);
app.use(compress);
app.use(requestMetrics);       
app.use(globalLimiter);
app.use(speedLimiter);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.set('io', io);

io.on('connection', (socket) => {
  activeWebSocketConnections.inc();
  logger.info('WebSocket connected', { socketId: socket.id });

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug('User joined room', { userId, socketId: socket.id });
  });

  socket.on('disconnect', () => {
    activeWebSocketConnections.dec();
    logger.info('WebSocket disconnected', { socketId: socket.id });
  });
});


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
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    },
    db: pool,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});


app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path,
  });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
    requestId: req.id,
  });
});


cron.schedule('0 9 * * *', async () => {
  logger.info('PR reminder cron job starting');
  try {
    await runPRReminders(io);
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'success' });
    logger.info('PR reminder cron job completed');
  } catch (err) {
    cronJobExecutions.inc({ job: 'pr_reminders', status: 'failure' });
    logger.error('PR reminder cron job failed', { error: err.message });
  }
});

app.post('/api/notifications/trigger-check', async (req, res) => {
  await runPRReminders(io);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () =>
  logger.info(`Server started`, { port: PORT, env: process.env.NODE_ENV || 'development' })
);
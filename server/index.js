require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const { securityHeaders, compress } = require('./middleware/security');
const { globalLimiter, authLimiter, githubLimiter, speedLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const { getPoolStats } = require('./db/index');

const authRoutes = require('./routes/auth');
const standupRoutes = require('./routes/standup');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const heatmapRoutes = require('./routes/heatmap');
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

app.use(requestLogger);

if (process.env.NODE_ENV === 'production') {
  app.use(globalLimiter);
  app.use(speedLimiter);
}

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10kb' })); 
app.use(cookieParser());

app.set('io', io);


io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
  });
  socket.on('disconnect', () => {});
});


app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/standup', standupRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/standup/generate', githubLimiter);

app.get('/api/health', (req, res) => {
  const pool = getPoolStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: pool,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
});

cron.schedule('0 9 * * *', () => runPRReminders(io));

app.post('/api/notifications/trigger-check', async (req, res) => {
  await runPRReminders(io);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () =>
  console.log(`Server instance running on port ${PORT}`)
);
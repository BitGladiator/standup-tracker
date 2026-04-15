require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const standupRoutes = require('./routes/standup');
const sessionRoutes = require('./routes/sessions');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const journalRoutes = require('./routes/journals');
const { runPRReminders } = require('./services/prReminderService');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.set('io', io);


io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/standup', standupRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/journals', journalRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


cron.schedule('0 9 * * *', () => {
  runPRReminders(io);
});


app.post('/api/notifications/trigger-check', async (req, res) => {
  await runPRReminders(io);
  res.json({ success: true, message: 'PR reminder check triggered' });
});

const PORT = process.env.PORT || 5500;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
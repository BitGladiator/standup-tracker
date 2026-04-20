require('dotenv').config({ path: '.env.test' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const authRoutes = require('../../routes/auth');
const standupRoutes = require('../../routes/standup');
const sessionRoutes = require('../../routes/sessions');
const settingsRoutes = require('../../routes/settings');
const notificationRoutes = require('../../routes/notifications');

const createTestServer = () => {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());


  app.set('io', {
    to: () => ({ emit: () => {} }),
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/standup', standupRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  return app;
};

const getAuthCookie = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `token=${token}`;
};

module.exports = { createTestServer, getAuthCookie };
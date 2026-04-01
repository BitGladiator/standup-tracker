const express = require('express');
const authenticate = require('../middleware/authenticate');

const router = express.Router();


router.get('/today', authenticate, async (req, res) => {
  res.json({ message: 'standup route working', userId: req.userId });
});

module.exports = router;
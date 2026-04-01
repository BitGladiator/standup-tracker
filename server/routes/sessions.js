const express = require('express');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  res.json({ message: 'sessions route working', userId: req.userId });
});

module.exports = router;
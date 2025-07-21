const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить всех пользователей (опционально только с btag)
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.query.withBtag ? { btag: { $ne: null, $ne: '' } } : {};
    const users = await User.find(filter).select('-password -refreshTokens');
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; 
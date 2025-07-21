const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json({ message: `Добро пожаловать в CRM, пользователь ${req.user.userId}` });
});

module.exports = router; 
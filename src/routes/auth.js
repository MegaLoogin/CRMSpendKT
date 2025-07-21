const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const ACCESS_TOKEN_EXPIRES = '15m'; // короткий срок жизни access токена
const REFRESH_TOKEN_EXPIRES = '7d'; // refresh токен живёт дольше

function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: ACCESS_TOKEN_EXPIRES });
}
function generateRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', { expiresIn: REFRESH_TOKEN_EXPIRES });
}

// Регистрация (только для admin)
router.post('/register', async (req, res) => {
  try {
    // Проверка accessToken и роли admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Нет авторизации' });
    }
    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return res.status(401).json({ message: 'Неверный токен' });
    }
    const adminUser = await User.findById(payload.userId);
    if (!adminUser || !adminUser.roles.includes('admin')) {
      return res.status(403).json({ message: 'Только админ может регистрировать пользователей' });
    }
    // Обычная регистрация
    const { username, password, btag, roles } = req.body;
    const candidate = await User.findOne({ username });
    if (candidate) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashPassword, btag, roles: roles || ['user'] });
    await user.save();
    res.status(201).json({ message: 'Пользователь создан' });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Добавляем refresh токен в массив
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ accessToken, refreshToken, username: user.username, btag: user.btag, roles: user.roles });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Endpoint для обновления access токена
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Нет refresh токена' });

    // Проверяем refresh токен
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET || 'secret');
    } catch {
      return res.status(403).json({ message: 'Неверный refresh токен' });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Refresh токен не найден' });
    }

    // Генерируем новый access токен
    const accessToken = generateAccessToken(user._id);
    res.json({ accessToken });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Logout — удаляем конкретный refresh токен
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Нет refresh токена' });

    const payload = jwt.decode(refreshToken);
    if (!payload) return res.status(400).json({ message: 'Некорректный токен' });

    const user = await User.findById(payload.userId);
    if (!user) return res.status(400).json({ message: 'Пользователь не найден' });

    user.refreshTokens = (user.refreshTokens || []).filter(token => token !== refreshToken);
    await user.save();

    res.json({ message: 'Выход выполнен' });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; 
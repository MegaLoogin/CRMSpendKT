const express = require('express');
const Commission = require('../models/Commission');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Middleware: только для админа
async function adminOnly(req, res, next) {
  const user = await User.findById(req.user.userId);
  if (!user || !user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Только для администратора' });
  }
  next();
}

// Получить все комиссии
router.get('/', auth, async (req, res) => {
  const list = await Commission.find().lean();
  res.json(list);
});

// Создать комиссию
router.post('/', auth, adminOnly, async (req, res) => {
  const { agency, percent } = req.body;
  if (!agency || percent == null) return res.status(400).json({ message: 'agency и percent обязательны' });
  try {
    const commission = new Commission({ agency, percent });
    await commission.save();
    res.status(201).json(commission);
  } catch (e) {
    res.status(400).json({ message: 'Ошибка создания', error: e.message });
  }
});

// Обновить комиссию
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { agency, percent } = req.body;
  try {
    const commission = await Commission.findByIdAndUpdate(req.params.id, { agency, percent }, { new: true });
    if (!commission) return res.status(404).json({ message: 'Не найдено' });
    res.json(commission);
  } catch (e) {
    res.status(400).json({ message: 'Ошибка обновления', error: e.message });
  }
});

// Удалить комиссию
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const commission = await Commission.findByIdAndDelete(req.params.id);
    if (!commission) return res.status(404).json({ message: 'Не найдено' });
    res.json({ message: 'Удалено' });
  } catch (e) {
    res.status(400).json({ message: 'Ошибка удаления', error: e.message });
  }
});

module.exports = router; 
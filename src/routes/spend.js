const express = require('express');
const SpendStat = require('../models/SpendStat');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Commission = require('../models/Commission');

const router = express.Router();

// Добавить спенд
router.post('/', auth, async (req, res) => {
  try {
    const { offer_id, date, spend, agency, btag } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    if (!agency) return res.status(400).json({ message: 'Не выбрано агентство' });
    
    // Определяем btag для сохранения
    let targetBtag = btag;
    let targetUser = user._id;
    
    if (btag && user.roles.includes('admin')) {
      // Админ добавляет спенд от лица другого пользователя
      const targetUserDoc = await User.findOne({ btag });
      if (!targetUserDoc) return res.status(400).json({ message: 'Пользователь с таким btag не найден' });
      targetUser = targetUserDoc._id;
    } else {
      // Обычный пользователь или админ без указания btag
      if (!user.btag) return res.status(400).json({ message: 'У пользователя не задан btag' });
      targetBtag = user.btag;
    }
    
    const commissionDoc = await Commission.findOne({ agency });
    if (!commissionDoc) return res.status(400).json({ message: 'Агентство не найдено' });
    const percent = commissionDoc.percent;
    const spendWithCommission = +(Number(spend) * (1 + percent / 100)).toFixed(2);
    
    // Проверяем, есть ли уже запись
    let stat = await SpendStat.findOne({ offer_id, date, btag: targetBtag, user: targetUser });
    if (stat) {
      stat.spend = spendWithCommission;
      stat.commission = percent;
      await stat.save();
    } else {
      stat = new SpendStat({
        offer_id,
        date,
        btag: targetBtag,
        user: targetUser,
        spend: spendWithCommission,
        commission: percent
      });
      await stat.save();
    }
    res.json({ message: 'Спенд сохранён', stat });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить отчёт по спендам
router.post('/report', auth, async (req, res) => {
  try {
    const { date, dateFrom, dateTo, offer_id, btag, user, grouping } = req.body;
    const query = {};
    if (date) query.date = date;
    if (dateFrom && dateTo) query.date = { $gte: dateFrom, $lte: dateTo };
    else if (dateFrom) query.date = { $gte: dateFrom };
    else if (dateTo) query.date = { $lte: dateTo };
    if (offer_id) query.offer_id = offer_id;
    if (btag) query.btag = btag;
    if (user) query.user = user;
    const stats = await SpendStat.find(query).lean();

    let rows = stats.map(s => {
      const { _id, user, __v, btag, date, commission, ...rest } = s;
      const row = {
        day: s.date,
        ...rest
      };
      if (Array.isArray(grouping) && grouping.includes('sub_id_6')) {
        row.sub_id_6 = s.btag;
      }
      return row;
    });
    if (Array.isArray(grouping) && grouping.length > 0) {
      // Группировка и агрегация
      const groupMap = {};
      rows.forEach(s => {
        const key = grouping.map(f => s[f] || '').join('|');
        if (!groupMap[key]) {
          groupMap[key] = { ...grouping.reduce((acc, f) => { acc[f] = s[f] || ''; return acc; }, {}), spend: 0 };
          if (grouping.includes('sub_id_6')) groupMap[key].sub_id_6 = s.sub_id_6;
          if (grouping.includes('day')) groupMap[key].day = s.day;
        }
        groupMap[key].spend += s.spend || 0;
        // groupMap[key].commission += s.commission || 0;
      });
      rows = Object.values(groupMap);
    }
    // summary
    const summary = rows.reduce((acc, row) => {
      Object.keys(row).forEach(k => {
        if (typeof row[k] === 'number') acc[k] = (acc[k] || 0) + row[k];
      });
      return acc;
    }, {});
    res.json({ rows, summary });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Импорт спендов через JSON без авторизации
router.post('/import', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Ожидался массив объектов' });
    }
    const results = [];
    for (const item of req.body) {
      const { btag, spend, date, commission, offer_id } = item;
      if (!btag || !spend || !date || !commission || !offer_id) {
        results.push({ success: false, error: 'Не все поля заполнены', item });
        continue;
      }
      const user = await User.findOne({ btag });
      let userId = user ? user._id : null;
      // Проверяем, есть ли уже запись
      let stat = await SpendStat.findOne({ offer_id, date, btag, user: userId });
      if (stat) {
        stat.spend = spend;
        stat.commission = commission;
        await stat.save();
        results.push({ success: true, updated: true, item, userFound: !!user });
      } else {
        stat = new SpendStat({
          offer_id,
          date,
          btag,
          user: userId,
          spend,
          commission
        });
        await stat.save();
        results.push({ success: true, created: true, item, userFound: !!user });
      }
    }
    res.json({ results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router; 
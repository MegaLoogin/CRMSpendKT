const express = require('express');
const { keitaroReport } = require('../keitaro');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить стату из Keitaro
router.post('/report', auth, async (req, res) => {
  try {
    const { date, dateFrom, dateTo, grouping, filters, offer_id, btag, metrics } = req.body;
    const data = await keitaroReport({ date, dateFrom, dateTo, grouping, filters, offer_id, btag, metrics });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка Keitaro', error: e.message });
  }
});

// Получить список офферов из Keitaro
router.get('/offers', auth, async (req, res) => {
  try {
    const offers = await require('../keitaro').getOffers();
    res.json(offers);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка Keitaro', error: e.message });
  }
});

// Совмещённая статистика: Keitaro + спенды
router.post('/combined', auth, async (req, res) => {
  try {
    const { date, dateFrom, dateTo, grouping, filters, offer_id, btag, metrics } = req.body;
    // 1. Получаем стату из Keitaro
    const keitaroData = await keitaroReport({ date, dateFrom, dateTo, grouping, filters, offer_id, btag, metrics });
    // 2. Получаем спенды через API, чтобы структура была нормализована
    const spendRes = await fetch('http://localhost:3000/api/spend/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({ date, dateFrom, dateTo, offer_id, btag, grouping })
    });
    const spendData = await spendRes.json();
    const spends = spendData.rows || [];

    // Определяем ключи для объединения на основе grouping
    const keyFields = Array.isArray(grouping) && grouping.length > 0 ? grouping : ['day'];
    function getKey(row) {
      return keyFields.map(f => String(row[f] ?? '')).join('|');
    }
    // Логируем ключи для отладки
    console.log('Keitaro keys:', (keitaroData.rows || []).map(getKey));
    console.log('Spends keys:', spends.map(getKey));
    // 3. Объединяем
    const spendMap = {};
    spends.forEach(s => { spendMap[getKey(s)] = s; });
    const rows = (keitaroData.rows || []).map(row => {
      const key = getKey(row);
      const spend = spendMap[key];
      return {
        ...row,
        spend: spend ? spend.spend : 0
        // commission: spend ? spend.commission : 0
      };
    });
    // Добавляем спенды, которых нет в Keitaro
    spends.forEach(s => {
      const sKey = getKey(s);
      if (!rows.find(r => getKey(r) === sKey)) {
        rows.push({
          ...s,
          spend: s.spend,
        //   commission: s.commission
        });
      }
    });
    // summary
    let summary = {};
    if (keitaroData.summary) {
      summary = { ...keitaroData.summary };
      // Для spend всегда считаем сумму по rows
      summary.spend = rows.reduce((acc, row) => acc + (typeof row.spend === 'number' ? row.spend : 0), 0);
      // Добавляем только те поля, которых нет в keitaroData.summary
      rows.forEach(row => {
        Object.keys(row).forEach(k => {
          if (k !== 'spend' && typeof row[k] === 'number' && summary[k] === undefined) {
            summary[k] = (summary[k] || 0) + row[k];
          }
        });
      });
    } else {
      summary = rows.reduce((acc, row) => {
        Object.keys(row).forEach(k => {
          if (typeof row[k] === 'number') acc[k] = (acc[k] || 0) + row[k];
        });
        return acc;
      }, {});
    }
    // Округляем все числовые значения в summary до 2 знаков
    Object.keys(summary).forEach(k => {
      if (typeof summary[k] === 'number') summary[k] = +summary[k].toFixed(2);
    });
    res.json({ rows, summary });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка совмещения', error: e.message });
  }
});

module.exports = router; 
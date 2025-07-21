const axios = require('axios');

const KT_DOMAIN = process.env.KT_DOMAIN;
const KT_TOKEN = process.env.KT_TOKEN;

if (!KT_DOMAIN || !KT_TOKEN) {
  console.warn('Keitaro: KT_DOMAIN или KT_TOKEN не заданы в .env');
}

const api = axios.create({
  baseURL: KT_DOMAIN ? `https://${KT_DOMAIN}/admin_api/v1` : '',
  headers: KT_TOKEN ? { 'Api-Key': KT_TOKEN } : {}
});

/**
 * Универсальный запрос к Keitaro report/build с поддержкой диапазона дат
 * @param {Object} params - параметры для запроса
 * @param {string} [params.date] - дата (YYYY-MM-DD)
 * @param {string} [params.dateFrom] - начало диапазона (YYYY-MM-DD)
 * @param {string} [params.dateTo] - конец диапазона (YYYY-MM-DD)
 * @param {Array} params.grouping - массив полей для группировки
 * @param {Array} params.filters - массив фильтров
 * @param {Array} [params.metrics] - массив метрик
 * @param {number} [params.offer_id] - id оффера (опционально)
 * @param {string} [params.btag] - btag (опционально)
 * @returns {Promise<object>} - ответ Keitaro
 */
async function keitaroReport({ date, dateFrom, dateTo, grouping, filters, metrics, offer_id, btag }) {
  if (!KT_DOMAIN || !KT_TOKEN) throw new Error('Keitaro не настроен');
  const usedFilters = [...(filters || [])];
  if (offer_id !== undefined) usedFilters.push({ name: 'offer_id', operator: 'EQUALS', expression: offer_id });
  if (btag !== undefined) usedFilters.push({ name: 'sub_id_6', operator: 'EQUALS', expression: btag });
  let from = dateFrom || date;
  let to = dateTo || date;
  if (!from) throw new Error('Не указана дата или диапазон дат');
  if (!to) to = from;
  const response = await api.post('/report/build', {
    range: { interval: 'custom_date_range', from: from + ' 0:00', to: to + ' 23:59', timezone: 'Europe/Moscow' },
    limit: 20000,
    offset: 0,
    metrics: metrics || ["clicks", "campaign_unique_clicks", "conversions", "revenue", "uepc_confirmed"],
    filters: usedFilters,
    summary: true,
    grouping: grouping || ["sub_id_6", "day"],
    extended: true,
    columns: []
  });
  return response.data;
}

/**
 * Получить список офферов из Keitaro
 * @returns {Promise<Array>} массив офферов
 */
async function getOffers() {
  if (!KT_DOMAIN || !KT_TOKEN) throw new Error('Keitaro не настроен');
  const response = await api.get('/offers');
  return response.data;
}

module.exports = {
  keitaroReport,
  getOffers
}; 
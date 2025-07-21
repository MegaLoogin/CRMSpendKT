import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import Select from 'react-select';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const GROUPING_OPTIONS = [
  { value: 'sub_id_6', label: 'BTag (sub_id_6)' },
  { value: 'day', label: 'День' },
  { value: 'offer_id', label: 'Offer ID' },
  // можно добавить другие опции
];
const METRICS_OPTIONS = [
  { value: 'clicks', label: 'Клики' },
  { value: 'campaign_unique_clicks', label: 'Уникальные клики' },
  { value: 'conversions', label: 'Конверсии' },
  { value: 'sale_revenue', label: 'Доход' },
  { value: 'uepc_confirmed', label: 'uEPC' },
  // можно добавить другие метрики
];

// Форматирование и перевод ключей
const fieldLabels = {
  sale_revenue: 'Доход',
  offer_id: 'Оффер',
  spend: 'Расход',
  profit: 'Прибыль',
  uepc_confirmed: 'uEPC',
  day: 'День',
  clicks: 'Клики',
  sub_id_6: 'BTag',
  conversions: 'Конверсии',
  campaign_unique_clicks: 'Ун. клики',
};
const fieldSuffix = {
  sale_revenue: '$',
  spend: '$',
  profit: '$',
  uepc_confirmed: '$',
};
function formatValue(key, value) {
  if (typeof value === 'number') {
    if (fieldSuffix[key]) {
      value = value % 1 === 0 ? value : value.toFixed(2);
      value = `${value}${fieldSuffix[key]}`;
    } else {
      value = value % 1 === 0 ? value : value.toFixed(2);
    }
  }
  return value;
}
function getLabel(key) {
  return fieldLabels[key] || key;
}

const intervals = [
  ["yesterday", "Вчера", 1, 1],
  ["3_days", "3 дня", 3, 1],
  ["7_days", "7 дней", 7, 1],
  ["week", "Неделя", (dayjs().day() === 0 ? 6 : dayjs().day() - 1), 1],
  ["30_days", "30 дней", 30, 1],
  ["month", "Месяц", (dayjs().date() - 1), 1],
  ["all_time", "Все время", dayjs().diff(dayjs('1970-01-01'), 'days'), 1]
];

const groupingMacros = [
  { value: 'summary', label: 'Суммарная', grouping: ['day'] },
  { value: 'by_offers', label: 'По офферам', grouping: ['day', 'offer_id'] },
  { value: 'by_btags', label: 'По BTag', grouping: ['day', 'sub_id_6'] },
  { value: 'detailed', label: 'Детальная', grouping: ['day', 'offer_id', 'sub_id_6'] }
];

function Stats() {
  const location = useLocation();
  const navigate = useNavigate();
  // По умолчанию диапазон за вчера
  const yesterday = dayjs().subtract(1, 'day');
  
  // Определяем мобильное устройство
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Обработчик изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [dateFrom, setDateFrom] = useState(yesterday);
  const [dateTo, setDateTo] = useState(yesterday);
  const [offerId, setOfferId] = useState('');
  const [offers, setOffers] = useState([]);
  const [btag, setBtag] = useState('');
  const [btagSearch, setBtagSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [grouping, setGrouping] = useState(['day']);
  const [metrics, setMetrics] = useState(['clicks', 'sale_revenue', 'conversions', 'uepc_confirmed', 'campaign_unique_clicks']);
  const [selectedMacro, setSelectedMacro] = useState('summary');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [offerSearch, setOfferSearch] = useState('');
  const [mode, setMode] = useState('combined'); // combined | keitaro | spend
  const [onlyNonZeroSpend, setOnlyNonZeroSpend] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [hideRepeats, setHideRepeats] = useState(true);
  const [hideNoSpend, setHideNoSpend] = useState(false);
  const [hideNoRevenue, setHideNoRevenue] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('yesterday');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      setOffersLoading(true);
      try {
        const res = await fetchWithAuth('/api/keitaro/offers');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setOffers(data);
      } catch {}
      setOffersLoading(false);
    }
    loadOffers();
  }, []);

  useEffect(() => {
    async function loadUsers() {
      setUsersLoading(true);
      try {
        const res = await fetchWithAuth('/api/users?withBtag=1');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setUsers(data);
      } catch {}
      setUsersLoading(false);
    }
    loadUsers();
  }, []);

  // Парсинг query-параметров при загрузке
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('dateFrom')) setDateFrom(dayjs(params.get('dateFrom')));
    if (params.get('dateTo')) setDateTo(dayjs(params.get('dateTo')));
    if (params.get('offerId')) setOfferId(params.get('offerId'));
    if (params.get('btag')) setBtag(params.get('btag'));
    if (params.get('grouping')) setGrouping(params.get('grouping').split(','));
    if (params.get('metrics')) setMetrics(params.get('metrics').split(','));
    if (params.get('mode')) setMode(params.get('mode'));
    if (params.get('hideNoSpend')) setHideNoSpend(params.get('hideNoSpend') === '1');
    if (params.get('hideNoRevenue')) setHideNoRevenue(params.get('hideNoRevenue') === '1');
    if (params.get('interval')) setSelectedInterval(params.get('interval'));
    if (params.get('macro')) setSelectedMacro(params.get('macro'));
  }, []);

  // Обновление query-параметров при изменении фильтров
  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom.format('YYYY-MM-DD'));
    if (dateTo) params.set('dateTo', dateTo.format('YYYY-MM-DD'));
    if (offerId) params.set('offerId', offerId);
    if (btag) params.set('btag', btag);
    if (grouping && grouping.length) params.set('grouping', grouping.join(','));
    if (metrics && metrics.length) params.set('metrics', metrics.join(','));
    if (mode) params.set('mode', mode);
    if (hideNoSpend) params.set('hideNoSpend', '1');
    if (hideNoRevenue) params.set('hideNoRevenue', '1');
    if (selectedInterval) params.set('interval', selectedInterval);
    if (selectedMacro) params.set('macro', selectedMacro);
    navigate({ search: params.toString() }, { replace: true });
  }, [dateFrom, dateTo, offerId, btag, grouping, metrics, mode, hideNoSpend, hideNoRevenue, selectedInterval, selectedMacro]);

  const offerOptions = offers.map(o => ({
    value: o.id,
    label: `${o.id} — ${o.name}`,
    name: o.name,
    id: o.id
  }));
  const selectedOffer = offerOptions.find(opt => opt.value === Number(offerId)) || null;

  const filterOption = (option, inputValue) => {
    const trimmed = inputValue.trim();
    if (/^\d+$/.test(trimmed)) {
      return option.data.id.toString().includes(trimmed);
    }
    const searchTerms = trimmed.toLowerCase().split(/[\s\-.,_]+/).filter(Boolean);
    const optionName = (option.data.name || '').toLowerCase();
    const optionId = option.data.id.toString();
    return searchTerms.every(term =>
      optionName.includes(term) ||
      optionId.includes(term)
    );
  };

  // --- btag select ---
  const btagOptions = users.filter(u => u.btag).map(u => ({
    value: u.btag,
    label: `${u.username} (${u.btag})`,
    username: u.username,
    btag: u.btag
  }));
  const selectedBtag = btagOptions.find(opt => opt.value === btag) || null;
  const filterBtagOption = (option, inputValue) => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return true;
    return (
      (option.data.username && option.data.username.toLowerCase().includes(trimmed)) ||
      (option.data.btag && option.data.btag.toLowerCase().includes(trimmed))
    );
  };

  // Получаем btag и роли пользователя из localStorage
  const userBtag = localStorage.getItem('btag') || '';
  let userRoles = [];
  try {
    userRoles = JSON.parse(localStorage.getItem('roles') || '[]');
  } catch {}
  const isAdmin = userRoles.includes('admin');

  // btag: если не админ, всегда свой и нельзя менять
  useEffect(() => {
    if (!isAdmin) {
      setBtag(userBtag);
    }
  }, [isAdmin, userBtag]);

  // Фильтрация опций группировки: не-админ не может выбрать sub_id_6
  const filteredGroupingOptions = isAdmin ? GROUPING_OPTIONS : GROUPING_OPTIONS.filter(opt => opt.value !== 'sub_id_6');
  const filteredGroupingMacros = isAdmin ? groupingMacros : groupingMacros.filter(m => !m.grouping.includes('sub_id_6'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      let url = '/api/keitaro/report';
      if (mode === 'combined') url = '/api/keitaro/combined';
      if (mode === 'spend') url = '/api/spend/report';
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: dateFrom ? dateFrom.format('YYYY-MM-DD') : '',
          dateTo: dateTo ? dateTo.format('YYYY-MM-DD') : '',
          grouping,
          offer_id: offerId ? Number(offerId) : undefined,
          btag: btag || undefined,
          metrics
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Ошибка запроса');
      }
    } catch {
      setError('Ошибка сервера');
    }
    setLoading(false);
  };

  // Приводим строки к нужному виду: если нет revenue/clicks/spend, подставляем 0
  let rowsWithProfit = result && result.rows ? result.rows.map(row => ({
    ...row,
    sale_revenue: typeof row.sale_revenue === 'number' ? row.sale_revenue : 0,
    clicks: typeof row.clicks === 'number' ? row.clicks : 0,
    spend: typeof row.spend === 'number' ? row.spend : 0,
    campaign_unique_clicks: typeof row.campaign_unique_clicks === 'number' ? row.campaign_unique_clicks : 0,
    conversions: typeof row.conversions === 'number' ? row.conversions : 0,
    uepc_confirmed: typeof row.uepc_confirmed === 'number' ? row.uepc_confirmed : 0,
  })) : [];
  // Добавить вычисление прибыли (profit) для каждой строки
  rowsWithProfit = rowsWithProfit.map(row => {
    let profit = undefined;
    if (typeof row.sale_revenue === 'number' && typeof row.spend === 'number') {
      profit = row.sale_revenue - row.spend;
    }
    return profit !== undefined ? { ...row, profit } : row;
  });
  // Добавить profit в summary
  let summaryWithProfit = result && result.summary ? { ...result.summary } : {};
  if (typeof summaryWithProfit.sale_revenue === 'number' && typeof summaryWithProfit.spend === 'number') {
    summaryWithProfit.profit = summaryWithProfit.sale_revenue - summaryWithProfit.spend;
  }
  // Получить все уникальные ключи для колонок таблицы
  const getColumns = () => {
    if (!rowsWithProfit || !rowsWithProfit.length) return [];
    const allKeys = new Set();
    rowsWithProfit.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    if (summaryWithProfit) Object.keys(summaryWithProfit).forEach(k => allKeys.add(k));
    return Array.from(allKeys);
  };
  const columns = getColumns();

  // Фильтрация по чекбоксам
  const filteredRows = rowsWithProfit.filter(row => {
    if (hideNoSpend && (!row.spend || row.spend === 0)) return false;
    if (hideNoRevenue && (!row.sale_revenue || row.sale_revenue === 0)) return false;
    return true;
  });

  // Сортировка строк
  const sortedRows = React.useMemo(() => {
    if (!filteredRows || !sortCol) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'ru')
        : String(bv).localeCompare(String(av), 'ru');
    });
    return sorted;
  }, [filteredRows, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Получить username по btag
  function getUsernameByBtag(btag) {
    const user = users.find(u => u.btag === btag);
    return user ? user.username : btag;
  }
  // Получить название оффера по offer_id
  function getOfferNameById(id) {
    const offer = offers.find(o => o.id === id);
    return offer ? `(${offer.id}) ${offer.name}` : id;
  }
  // Для скрытия повторяющихся значений в колонках day, offer_id, sub_id_6
  function getDisplayValue(col, row, prevRow) {
    let value = row[col];
    let rawValue = value;
    if (col === 'sub_id_6') {
      value = getUsernameByBtag(row['sub_id_6']);
      rawValue = row['sub_id_6'];
    }
    if (col === 'offer_id') {
      value = getOfferNameById(row['offer_id']);
      rawValue = row['offer_id'];
    }
    // Для числовых полей revenue/clicks/spend всегда показываем 0, если пусто
    if (["sale_revenue","clicks","spend"].includes(col) && (value === undefined || value === null)) value = 0;
    if (!hideRepeats) return formatValue(col, value);
    if (!prevRow) return formatValue(col, value);
    let prevValue = prevRow[col];
    if (col === 'sub_id_6') prevValue = getUsernameByBtag(prevRow['sub_id_6']);
    if (col === 'offer_id') prevValue = getOfferNameById(prevRow['offer_id']);
    if (["day", "offer_id", "sub_id_6"].includes(col) && value === prevValue) {
      return '';
    }
    return formatValue(col, value);
  }

  // Функция для применения выбранного интервала
  function applyInterval(intervalKey) {
    const interval = intervals.find(i => i[0] === intervalKey);
    if (!interval) return;
    const from = dayjs().subtract(interval[2], 'day');
    const to = dayjs().subtract(interval[3], 'day');
    setDateFrom(from);
    setDateTo(to);
    setSelectedInterval(intervalKey);
  }

  function applyMacro(macroKey) {
    const macro = groupingMacros.find(m => m.value === macroKey);
    if (!macro) return;
    setGrouping(macro.grouping);
    setSelectedMacro(macroKey);
  }

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '8px' : '0'}}>
      <h2 style={{
        textAlign:'center', 
        marginBottom: isMobile ? 16 : 24, 
        fontWeight: 600, 
        fontSize: isMobile ? 20 : 28, 
        letterSpacing: 1
      }}>Статистика из Keitaro</h2>
      <form onSubmit={handleSubmit} style={{
        background:'#f9f9f9', 
        borderRadius:12, 
        boxShadow:'0 2px 12px #0001', 
        padding: isMobile ? 16 : 24, 
        marginBottom: isMobile ? 16 : 32
      }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div style={{
            display:'flex', 
            gap: isMobile ? 8 : 16, 
            margin:'10px 0', 
            alignItems:'center', 
            flexWrap:'wrap',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{display:'flex', gap: isMobile ? 8 : 16, width: isMobile ? '100%' : 'auto'}}>
              <DatePicker
                label="С"
                value={dateFrom}
                onChange={setDateFrom}
                format="YYYY-MM-DD"
                slotProps={{ textField: { size: 'small', required: true, fullWidth: isMobile } }}
              />
              <DatePicker
                label="По"
                value={dateTo}
                onChange={setDateTo}
                format="YYYY-MM-DD"
                slotProps={{ textField: { size: 'small', required: true, fullWidth: isMobile } }}
              />
            </div>
            <div style={{minWidth: isMobile ? '100%' : 180, width: isMobile ? '100%' : 'auto'}}>
              <Select
                options={intervals.map(i => ({ value: i[0], label: i[1] }))}
                value={intervals.map(i => ({ value: i[0], label: i[1] })).find(opt => opt.value === selectedInterval) || null}
                onChange={opt => opt && applyInterval(opt.value)}
                isClearable={false}
                placeholder="Интервал"
              />
            </div>
            <div style={{minWidth: isMobile ? '100%' : 300, width: isMobile ? '100%' : 'auto'}}>
              <Select
                options={offerOptions}
                value={selectedOffer}
                onChange={opt => setOfferId(opt ? opt.value : '')}
                isClearable
                isLoading={offersLoading}
                placeholder="Выберите оффер (поиск по id, названию, словам)"
                noOptionsMessage={() => offersLoading ? 'Загрузка...' : 'Нет совпадений'}
                onInputChange={setOfferSearch}
                inputValue={offerSearch}
                filterOption={filterOption}
              />
            </div>
            {/* btag: только для админа показываем фильтр */}
            {isAdmin && (
              <div style={{minWidth: isMobile ? '100%' : 300, width: isMobile ? '100%' : 'auto'}}>
                <Select
                  options={btagOptions}
                  value={selectedBtag}
                  onChange={opt => setBtag(opt ? opt.value : '')}
                  isClearable
                  isLoading={usersLoading}
                  placeholder="Выберите пользователя с btag (поиск по имени или btag)"
                  noOptionsMessage={() => usersLoading ? 'Загрузка...' : 'Нет совпадений'}
                  filterOption={filterBtagOption}
                />
              </div>
            )}
            <div style={{minWidth: isMobile ? '100%' : 200, width: isMobile ? '100%' : 'auto'}}>
              <Select
                options={filteredGroupingMacros.map(m => ({ value: m.value, label: m.label }))}
                value={filteredGroupingMacros.map(m => ({ value: m.value, label: m.label })).find(opt => opt.value === selectedMacro) || null}
                onChange={opt => opt && applyMacro(opt.value)}
                isClearable={false}
                placeholder="Макрос группировки"
              />
            </div>
          </div>
        </LocalizationProvider>
        <div style={{
          display:'flex', 
          gap: isMobile ? 8 : 16, 
          margin:'10px 0', 
          alignItems:'center', 
          flexWrap:'wrap',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div style={{display:'flex', gap: isMobile ? 8 : 16, flexWrap: 'wrap'}}>
            <label style={{marginRight: isMobile ? 0 : 16, marginBottom: isMobile ? 8 : 0}}>
              <input type="checkbox" checked={hideNoSpend} onChange={e => setHideNoSpend(e.target.checked)} />
              &nbsp;Скрыть без спенда
            </label>
            <label style={{marginBottom: isMobile ? 8 : 0}}>
              <input type="checkbox" checked={hideNoRevenue} onChange={e => setHideNoRevenue(e.target.checked)} />
              &nbsp;Скрыть без дохода
            </label>
          </div>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: isMobile ? '8px 16px' : '6px 16px',
              borderRadius: 6,
              background: showAdvanced ? '#1976d2' : '#f5f5f5',
              color: showAdvanced ? '#fff' : '#333',
              border: '1px solid #ddd',
              fontWeight: 500,
              fontSize: isMobile ? 16 : 14,
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            {showAdvanced ? 'Скрыть' : 'Показать'} дополнительные параметры
          </button>
        </div>
        {showAdvanced && (
          <div style={{borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16}}>
            <div style={{
              display:'flex', 
              gap: isMobile ? 8 : 16, 
              margin:'10px 0', 
              alignItems:'center', 
              flexWrap:'wrap',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <div style={{minWidth: isMobile ? '100%' : 300, width: isMobile ? '100%' : 'auto'}}>
                <Select
                  options={filteredGroupingOptions}
                  value={filteredGroupingOptions.filter(opt => grouping.includes(opt.value))}
                  onChange={opts => setGrouping(opts ? opts.map(o => o.value) : [])}
                  isMulti
                  placeholder="Группировка (можно выбрать несколько)"
                  closeMenuOnSelect={false}
                />
              </div>
              <div style={{minWidth: isMobile ? '100%' : 300, width: isMobile ? '100%' : 'auto'}}>
                <Select
                  options={METRICS_OPTIONS}
                  value={METRICS_OPTIONS.filter(opt => metrics.includes(opt.value))}
                  onChange={opts => setMetrics(opts ? opts.map(o => o.value) : [])}
                  isMulti
                  placeholder="Метрики (можно выбрать несколько)"
                  closeMenuOnSelect={false}
                />
              </div>
              <FormControl style={{width: isMobile ? '100%' : 'auto'}}>
                <FormLabel>Источник данных</FormLabel>
                <RadioGroup 
                  row={!isMobile} 
                  value={mode} 
                  onChange={e => setMode(e.target.value)}
                  style={{flexDirection: isMobile ? 'column' : 'row'}}
                >
                  <FormControlLabel value="combined" control={<Radio />} label="Совмещённая" />
                  <FormControlLabel value="keitaro" control={<Radio />} label="Только Keitaro" />
                  <FormControlLabel value="spend" control={<Radio />} label="Только спенды" />
                </RadioGroup>
              </FormControl>
            </div>
          </div>
        )}
        <button type="submit" disabled={loading} style={{
          padding: isMobile ? '12px 24px' : '8px 24px', 
          borderRadius:6, 
          background:'#1976d2', 
          color:'#fff', 
          border:'none', 
          fontWeight:500, 
          fontSize: isMobile ? 18 : 16, 
          cursor:'pointer', 
          marginTop:8,
          width: isMobile ? '100%' : 'auto'
        }}>{loading ? 'Загрузка...' : 'Показать'}</button>
      </form>
      {error && <div style={{color:'red', marginBottom:16}}>{error}</div>}
      {result && sortedRows && sortedRows.length > 0 && (
        <div style={{
          marginTop: isMobile ? 16 : 20, 
          position:'relative', 
          boxShadow:'0 2px 16px #0002', 
          borderRadius:12, 
          background:'#fff', 
          maxWidth:'100%',
          overflow: 'hidden'
        }}>
          <div style={{
            display:'flex', 
            justifyContent: isMobile ? 'center' : 'flex-end', 
            alignItems:'center', 
            padding: isMobile ? '8px 8px 0 8px' : '8px 16px 0 16px'
          }}>
            <button type="button" onClick={()=>setHideRepeats(v=>!v)} style={{
              padding: isMobile ? '8px 16px' : '6px 18px', 
              borderRadius:6, 
              background:hideRepeats?'#1976d2':'#eee', 
              color:hideRepeats?'#fff':'#333', 
              border:'none', 
              fontWeight:500, 
              fontSize: isMobile ? 16 : 14, 
              cursor:'pointer', 
              marginBottom:8,
              width: isMobile ? '100%' : 'auto'
            }}>
              {hideRepeats ? 'Показать все значения' : 'Скрывать повторы'}
            </button>
          </div>
          {/* sticky header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            background: '#1976d2',
            zIndex: 40,
            fontWeight: 600,
            color: '#fff',
            fontSize: isMobile ? 12 : 16,
            letterSpacing: 0.5,
            borderRadius: '12px 12px 0 0',
            minHeight: isMobile ? 40 : 48,
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: -1
          }}>
            {columns.map(col => (
              <div key={col} style={{
                padding: isMobile ? '8px 4px' : '10px 8px', 
                cursor:'pointer',
                fontSize: isMobile ? 11 : 16
              }} onClick={() => handleSort(col)}>
                {getLabel(col)}
                {sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </div>
            ))}
          </div>
          <div style={{
            maxHeight: isMobile ? '60vh' : '75vh', 
            overflowY:'auto', 
            borderRadius:'0 0 12px 12px',
            overflowX: isMobile ? 'auto' : 'hidden'
          }}>
            <table style={{
              borderCollapse:'separate',
              borderSpacing:0, 
              width:'100%', 
              minWidth: isMobile ? 600 : 800, 
              fontSize: isMobile ? 12 : 15, 
              borderRadius:12, 
              overflow:'hidden'
            }}>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={i} style={{background: i%2===0 ? '#f6f8fa' : '#fff', transition:'background 0.2s'}}>
                    {columns.map(col => (
                      <td key={col} style={{
                        padding: isMobile ? '6px 4px' : '8px 8px', 
                        border:'none', 
                        textAlign:'center', 
                        minWidth: isMobile ? 70 : 90,
                        maxWidth: col==='offer_id'||col==='sub_id_6'?10:undefined,
                        whiteSpace: col==='offer_id'||col==='sub_id_6'?'nowrap':undefined,
                        overflow: col==='offer_id'||col==='sub_id_6'?'hidden':undefined,
                        textOverflow: col==='offer_id'||col==='sub_id_6'?'ellipsis':undefined,
                        fontSize: isMobile ? 11 : 15
                      }}
                      title={col==='offer_id'?getOfferNameById(row['offer_id']):col==='sub_id_6'?getUsernameByBtag(row['sub_id_6']):undefined}
                      >
                        {getDisplayValue(col, row, sortedRows[i-1])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* sticky summary footer */}
          {summaryWithProfit && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              position: 'sticky',
              left: 0,
              right: 0,
              bottom: 0,
              background: '#e3eafc',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 -2px 8px #0001',
              zIndex: 20,
              fontWeight: 700,
              color: '#1976d2',
              fontSize: isMobile ? 12 : 16,
              borderTop: '2px solid #1976d2',
              minHeight: isMobile ? 40 : 48,
              alignItems: 'center',
              textAlign: 'center',
              marginTop: 0
            }}>
              {columns.map(col => (
                <div key={col} style={{
                  padding: isMobile ? '8px 4px' : '10px 8px',
                  fontSize: isMobile ? 11 : 16
                }}>{summaryWithProfit[col] !== undefined ? formatValue(col, summaryWithProfit[col]) : ''}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {result && (!result.rows || result.rows.length === 0) && <div style={{marginTop:20, color:'#888', textAlign:'center'}}>Нет данных</div>}
    </div>
  );
}

export default Stats; 
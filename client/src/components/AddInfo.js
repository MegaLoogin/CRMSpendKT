import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import Select from 'react-select';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import './AddInfo.css';

function AddInfo({ token }) {
  const [offers, setOffers] = useState([]);
  const [users, setUsers] = useState([]);
  const [offerId, setOfferId] = useState('');
  const [userBtag, setUserBtag] = useState('');
  const [date, setDate] = useState(dayjs().subtract(1, 'day'));
  const [spend, setSpend] = useState('');
  const [commission, setCommission] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [myBtag, setMyBtag] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);

  useEffect(() => {
    setRoles(JSON.parse(localStorage.getItem('roles') || '[]'));
    setMyBtag(localStorage.getItem('btag') || '');
  }, []);

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
    if (!roles.includes('admin')) return;
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
  }, [roles]);

  useEffect(() => {
    async function loadAgencies() {
      try {
        const res = await fetchWithAuth('/api/commission');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setAgencies(data);
      } catch {}
    }
    loadAgencies();
  }, []);

  const offerOptions = offers.map(o => ({
    value: o.id,
    label: `${o.id} — ${o.name}`
  }));
  const selectedOffer = offerOptions.find(opt => opt.value === Number(offerId)) || null;

  const btagOptions = users.filter(u => u.btag).map(u => ({
    value: u.btag,
    label: `${u.username} (${u.btag})`
  }));
  const selectedBtag = btagOptions.find(opt => opt.value === userBtag) || null;

  const agencyOptions = agencies.map(a => ({ value: a.agency, label: `${a.agency} (${a.percent}%)`, percent: a.percent }));
  const handleAgencyChange = (opt) => {
    setSelectedAgency(opt);
    if (opt && spend) {
      setCommission(((Number(spend) * opt.percent) / 100).toFixed(2));
    } else {
      setCommission('');
    }
  };
  useEffect(() => {
    if (selectedAgency && spend) {
      setCommission(((Number(spend) * selectedAgency.percent) / 100).toFixed(2));
    }
  }, [spend, selectedAgency]);

  const spendWithCommission = selectedAgency && spend ? (Number(spend) * (1 + selectedAgency.percent / 100)).toFixed(2) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerId ? Number(offerId) : undefined,
          date: date ? date.format('YYYY-MM-DD') : '',
          spend: Number(spend),
          agency: selectedAgency ? selectedAgency.value : undefined,
          btag: roles.includes('admin') ? userBtag : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Спенд успешно отправлен!');
        setSpend('');
        setSelectedAgency(null);
      } else {
        setError(data.message || 'Ошибка отправки');
      }
    } catch {
      setError('Ошибка сервера');
    }
    setLoading(false);
  };

  return (
    <div className="addinfo-bg">
      <div className="addinfo-card">
        <h2 className="addinfo-title">Добавить спенд</h2>
        <form className="addinfo-form" onSubmit={handleSubmit}>
          <div className="addinfo-field">
            <Select
              options={offerOptions}
              value={selectedOffer}
              onChange={opt => setOfferId(opt ? opt.value : '')}
              isClearable
              isLoading={offersLoading}
              placeholder="Выберите оффер"
            />
          </div>
          <div className="addinfo-field">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Дата"
                value={date}
                onChange={setDate}
                format="YYYY-MM-DD"
                maxDate={dayjs().subtract(1, 'day')}
                slotProps={{ textField: { size: 'small', required: true } }}
              />
            </LocalizationProvider>
          </div>
          {roles.includes('admin') ? (
            <div className="addinfo-field">
              <Select
                options={btagOptions}
                value={selectedBtag}
                onChange={opt => setUserBtag(opt ? opt.value : '')}
                isClearable
                isLoading={usersLoading}
                placeholder="Выберите пользователя с btag"
              />
            </div>
          ) : (
            <div className="addinfo-field">
              <input className="addinfo-input" type="text" value={myBtag} disabled placeholder="Ваш btag" />
            </div>
          )}
          <div className="addinfo-field">
            <Select
              options={agencyOptions}
              value={selectedAgency}
              onChange={handleAgencyChange}
              isClearable
              placeholder="Выберите агентство"
            />
          </div>
          {selectedAgency && spend && (
            <div className="addinfo-summary">
              Итоговая сумма со всеми комиссиями: <b>{spendWithCommission}</b>
            </div>
          )}
          <div className="addinfo-field">
            <input
              className="addinfo-input"
              type="number"
              placeholder="Сумма спенда"
              value={spend}
              onChange={e => setSpend(e.target.value)}
              required
              min={0}
              step={0.01}
            />
          </div>
          <button className="addinfo-btn" type="submit" disabled={loading}>{loading ? 'Отправка...' : 'Отправить'}</button>
        </form>
        {message && <div className="addinfo-message">{message}</div>}
        {error && <div className="addinfo-error">{error}</div>}
      </div>
    </div>
  );
}

export default AddInfo; 
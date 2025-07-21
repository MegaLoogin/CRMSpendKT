import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import './CommissionManager.css';

function CommissionManager() {
  const [commissions, setCommissions] = useState([]);
  const [agency, setAgency] = useState('');
  const [percent, setPercent] = useState('');
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/commission');
      const data = await res.json();
      if (res.ok) setCommissions(data);
    } catch {
      setError('Ошибка загрузки');
    }
    setLoading(false);
  };

  useEffect(() => { loadCommissions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!agency || percent === '') { setError('Заполните все поля'); return; }
    try {
      const res = await fetchWithAuth('/api/commission' + (editId ? '/' + editId : ''), {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency, percent: Number(percent) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(editId ? 'Обновлено' : 'Добавлено');
        setAgency(''); setPercent(''); setEditId(null);
        loadCommissions();
      } else {
        setError(data.message || 'Ошибка');
      }
    } catch { setError('Ошибка сервера'); }
  };

  const handleEdit = (c) => {
    setAgency(c.agency); setPercent(c.percent); setEditId(c._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить агентство?')) return;
    setError(''); setMessage('');
    try {
      const res = await fetchWithAuth('/api/commission/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Удалено');
        loadCommissions();
      } else {
        setError(data.message || 'Ошибка удаления');
      }
    } catch { setError('Ошибка сервера'); }
  };

  return (
    <div className="commission-bg">
      <div className="commission-card">
        <h2 className="commission-title">Управление агентствами</h2>
        <form className="commission-form" onSubmit={handleSubmit}>
          <input
            className="commission-input"
            type="text"
            placeholder="Название агентства"
            value={agency}
            onChange={e => setAgency(e.target.value)}
            required
          />
          <input
            className="commission-input"
            type="number"
            placeholder="% комиссии"
            value={percent}
            onChange={e => setPercent(e.target.value)}
            min={0}
            max={100}
            step={0.01}
            required
          />
          <button className="commission-btn" type="submit" disabled={loading}>{editId ? 'Сохранить' : 'Добавить'}</button>
          {editId && <button className="commission-btn cancel" type="button" onClick={()=>{setEditId(null);setAgency('');setPercent('');}}>Отмена</button>}
        </form>
        {message && <div className="commission-message">{message}</div>}
        {error && <div className="commission-error">{error}</div>}
        <div className="commission-table-wrap">
          <table className="commission-table">
            <thead>
              <tr>
                <th>Агентство</th>
                <th>% комиссии</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {commissions.map(c => (
                <tr key={c._id}>
                  <td>{c.agency}</td>
                  <td>{c.percent}</td>
                  <td>
                    <button className="commission-table-btn" onClick={()=>handleEdit(c)} disabled={loading}>Редактировать</button>
                    <button className="commission-table-btn danger" onClick={()=>handleDelete(c._id)} disabled={loading}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CommissionManager; 
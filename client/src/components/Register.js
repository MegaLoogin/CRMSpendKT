import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [btag, setBtag] = useState('');
  const [role, setRole] = useState('user');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isAdmin = roles.includes('admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
        },
        body: JSON.stringify({ username, password, btag, roles: [role] })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Регистрация успешна!');
        setTimeout(() => navigate('/login'), 1000);
      } else {
        setError(data.message || 'Ошибка регистрации');
      }
    } catch {
      setError('Ошибка сервера');
    }
  };

  return (
    <div className="register-bg">
      <form className="register-card" onSubmit={handleSubmit}>
        <h2 className="register-title">Регистрация</h2>
        <input
          className="register-input"
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          className="register-input"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          className="register-input"
          type="text"
          placeholder="BTag (необязательно)"
          value={btag}
          onChange={e => setBtag(e.target.value)}
        />
        {isAdmin && (
          <select className="register-input" value={role} onChange={e => setRole(e.target.value)} required>
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        )}
        <button className="register-btn" type="submit">Зарегистрироваться</button>
        {message && <div className="register-message">{message}</div>}
        {error && <div className="register-error">{error}</div>}
        {/* <div className="register-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div> */}
      </form>
    </div>
  );
}

export default Register;


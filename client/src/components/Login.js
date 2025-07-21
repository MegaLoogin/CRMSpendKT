import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('username', data.username || '');
        localStorage.setItem('btag', data.btag || '');
        localStorage.setItem('roles', JSON.stringify(data.roles || []));
        onLogin(data.accessToken);
        navigate('/add');
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch {
      setError('Ошибка сервера');
    }
  };

  return (
    <div className="login-bg">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Вход в CRM</h2>
        <input
          className="login-input"
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          className="login-input"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="login-btn" type="submit">Войти</button>
        {error && <div className="login-error">{error}</div>}
        {/* <div className="login-link">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </div> */}
      </form>
    </div>
  );
}

export default Login; 
import React from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AddInfo from './components/AddInfo';
import Stats from './components/Stats';
import CommissionManager from './components/CommissionManager';
import './App.css';

function Sidebar({ roles, onLogout, sidebarOpen, onNavClick }) {
  const username = localStorage.getItem('username') || '';
  const btag = localStorage.getItem('btag') || '';
  const isMobile = window.innerWidth <= 768;
  
  return (
    <div className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-user">
        <div className="sidebar-username">{username}</div>
        {btag && <div className="sidebar-btag">{btag}</div>}
      </div>
      <div className="sidebar-links">
        <NavLink to="/add" className={({isActive})=>isActive?"active":undefined} onClick={onNavClick}>
          {isMobile && <span style={{marginRight: 8}}>➕</span>}Добавить спенд
        </NavLink>
        <NavLink to="/stats" className={({isActive})=>isActive?"active":undefined} onClick={onNavClick}>
          {isMobile && <span style={{marginRight: 8}}>📊</span>}Статистика
        </NavLink>
        {roles.includes('admin') && <NavLink to="/commission" className={({isActive})=>isActive?"active":undefined} onClick={onNavClick}>
          {isMobile && <span style={{marginRight: 8}}>💰</span>}Комиссии
        </NavLink>}
        {roles.includes('admin') && <NavLink to="/register" className={({isActive})=>isActive?"active":undefined} onClick={onNavClick}>
          {isMobile && <span style={{marginRight: 8}}>👤</span>}Регистрация
        </NavLink>}
      </div>
      <button className="sidebar-logout" onClick={onLogout}>Выйти</button>
    </div>
  );
}

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('accessToken'));
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Закрытие sidebar при переходе по ссылке
  const handleNavClick = () => {
    if (window.innerWidth <= 700) setSidebarOpen(false);
  };

  const handleLogin = (jwt) => {
    localStorage.setItem('accessToken', jwt);
    setToken(jwt);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('btag');
    localStorage.removeItem('roles');
    setToken(null);
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {token && (
        <>
          <button className="sidebar-toggle" onClick={()=>setSidebarOpen(v=>!v)}>
            ☰
          </button>
          <div className={sidebarOpen ? 'sidebar-bg open' : 'sidebar-bg'} onClick={()=>setSidebarOpen(false)} />
          <Sidebar roles={roles} onLogout={handleLogout} sidebarOpen={sidebarOpen} onNavClick={handleNavClick} />
        </>
      )}
      <div className={token ? "main-content with-sidebar" : "main-content"}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={
            token && roles.includes('admin') ? <Register /> : <Navigate to={token ? "/add" : "/login"} />
          } />
          <Route path="/add" element={
            token ? <AddInfo token={token} /> : <Navigate to="/login" />
          } />
          <Route path="/stats" element={
            token ? <Stats token={token} /> : <Navigate to="/login" />
          } />
          <Route path="/commission" element={
            token && roles.includes('admin') ? <CommissionManager /> : <Navigate to={token ? "/add" : "/login"} />
          } />
          <Route path="*" element={<Navigate to={token ? "/add" : "/login"} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;

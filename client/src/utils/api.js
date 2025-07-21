export async function fetchWithAuth(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  let refreshToken = localStorage.getItem('refreshToken');

  // Добавляем accessToken в заголовки
  options.headers = options.headers || {};
  if (accessToken) {
    options.headers['Authorization'] = 'Bearer ' + accessToken;
  }

  let response = await fetch(url, options);

  if (response.status === 401 && refreshToken) {
    // Пробуем обновить accessToken
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.ok && refreshData.accessToken) {
      localStorage.setItem('accessToken', refreshData.accessToken);
      // Повторяем исходный запрос с новым accessToken
      options.headers['Authorization'] = 'Bearer ' + refreshData.accessToken;
      response = await fetch(url, options);
    } else {
      // refreshToken невалиден — разлогиниваем
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new Error('Сессия истекла');
    }
  }

  return response;
} 
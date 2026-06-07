import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { ErrorBoundary, BottomNav } from './components';
import { useHashRoute } from './hooks/useHashRoute';
import { API, tokenStore } from './utils';
import { Login, NewBooking, MyBookings, Schedule, AdminBookings, AdminHalls, AdminUsers } from './pages';

function PageRouter({ route, request, go, user, setNotice }) {
  return (
    <>
      <div style={{ display: route.startsWith('/new-booking') ? '' : 'none' }}><ErrorBoundary><NewBooking request={request} go={go} setNotice={setNotice} user={user} /></ErrorBoundary></div>
      <div style={{ display: route === '/my-bookings' ? '' : 'none' }}><ErrorBoundary><MyBookings request={request} setNotice={setNotice} /></ErrorBoundary></div>
      <div style={{ display: (route === '/admin' || route === '/admin/bookings') ? '' : 'none' }}><ErrorBoundary><AdminBookings request={request} setNotice={setNotice} /></ErrorBoundary></div>
      <div style={{ display: route === '/admin/halls' ? '' : 'none' }}><ErrorBoundary><AdminHalls request={request} setNotice={setNotice} /></ErrorBoundary></div>
      <div style={{ display: route === '/admin/users' ? '' : 'none' }}><ErrorBoundary><AdminUsers request={request} /></ErrorBoundary></div>
      <div style={{ display: route === '/schedule' ? '' : 'none' }}><ErrorBoundary><Schedule request={request} go={go} user={user} /></ErrorBoundary></div>
    </>
  );
}

export function App() {
  const [route, go] = useHashRoute();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Что-то пошло не так');
    return data;
  };

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      go('/login');
      return;
    }
    request('/api/auth/me')
      .then(({ user: current }) => {
        setUser(current);
        if (route === '/login' || route === '/') go('/schedule');
      })
      .catch(() => {
        tokenStore.clear();
        go('/login');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user && (route === '/' || route === '/login')) go('/schedule');
  }, [user, route]);

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    go('/login');
  };

  if (loading) return <main className="center-screen">Загрузка...</main>;
  if (!user) return <Login request={request} onLogin={(token, nextUser) => { tokenStore.set(token); setUser(nextUser); go('/schedule'); }} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Бронирование залов</p>
          <h1>{user.role === 'admin' ? 'Админ-панель' : 'Расписание'}</h1>
        </div>
        <button className="icon-button" onClick={logout} aria-label="Выйти"><LogOut size={20} /></button>
      </header>
      {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
      <main className="content">
        <ErrorBoundary>
          <PageRouter route={route} request={request} go={go} user={user} setNotice={setNotice} />
        </ErrorBoundary>
      </main>
      <BottomNav user={user} route={route} go={go} />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, DoorOpen, LogOut, Plus, Users } from 'lucide-react';
import './styles.css';

const API = '';
const labels = {
  pending: 'Ожидает подтверждения',
  approved: 'Подтверждено',
  rejected: 'Отклонено',
  cancelled: 'Отменено'
};
const dayStartHour = 8;
const dayEndHour = 22;
const hourRows = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, index) => dayStartHour + index);
const hallColors = ['#2563eb', '#20a36b', '#f59e0b', '#e11d48', '#7c3aed', '#0f766e', '#ea580c', '#0891b2', '#be123c', '#4f46e5', '#65a30d', '#9333ea'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const niceDate = (date) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
const toISO = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return toISO(next);
};
const startOfWeek = (date) => {
  const current = new Date(`${date}T12:00:00`);
  const offset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  current.setDate(current.getDate() + offset);
  return toISO(current);
};
const weekDays = (date) => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
const monthDays = (date) => {
  const current = new Date(`${date}T12:00:00`);
  const first = new Date(current.getFullYear(), current.getMonth(), 1, 12);
  const last = new Date(current.getFullYear(), current.getMonth() + 1, 0, 12);
  return Array.from({ length: last.getDate() }, (_, index) => toISO(new Date(current.getFullYear(), current.getMonth(), index + 1, 12)));
};
const shortDate = (date) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const tokenStore = {
  get: () => localStorage.getItem('token'),
  set: (token) => localStorage.setItem('token', token),
  clear: () => localStorage.removeItem('token')
};

function useHashRoute() {
  const [route, setRoute] = useState(location.hash.replace('#', '') || '/');
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace('#', '') || '/');
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  const go = (path) => {
    location.hash = path;
    setRoute(path);
  };
  return [route, go];
}

function App() {
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
        {route.startsWith('/new-booking') && <NewBooking request={request} go={go} setNotice={setNotice} />}
        {route === '/my-bookings' && <MyBookings request={request} setNotice={setNotice} />}
        {route === '/admin' || route === '/admin/bookings' ? <AdminBookings request={request} setNotice={setNotice} /> : null}
        {route === '/admin/halls' && <AdminHalls request={request} setNotice={setNotice} />}
        {route === '/admin/users' && <AdminUsers request={request} />}
        {route === '/schedule' && <Schedule request={request} go={go} user={user} />}
      </main>
      <BottomNav user={user} route={route} go={go} />
    </div>
  );
}

function Login({ request, onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Введите имя');
    if (!password) return setError('Введите пароль');
    setBusy(true);
    setError('');
    try {
      const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, password, code }) });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand-mark">БЗ</div>
        <h1>Бронирование залов</h1>
        <p>Первый вход: имя, инвайт-код и пароль. Потом входите по имени и паролю.</p>
        <form onSubmit={submit}>
          <label>Ваше имя<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label>Пароль<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" /></label>
          <label>Инвайт-код<input value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="one-time-code" /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Входим...' : 'Войти'}</button>
        </form>
      </section>
    </main>
  );
}

function Schedule({ request, go, user }) {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState('rooms');
  const [halls, setHalls] = useState([]);
  const [range, setRange] = useState([]);
  const [rangeFilter, setRangeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const rangeHalls = range.length
    ? Object.values(range.reduce((acc, r) => { r.halls?.forEach((h) => { acc[h.id] = acc[h.id] || h; }); return acc; }, {}))
    : halls;

  const load = () => {
    setLoading(true);
    request(`/api/bookings/schedule?date=${date}`).then((data) => setHalls(data.halls)).finally(() => setLoading(false));
  };
  useEffect(load, [date]);

  useEffect(() => {
    if (!['week', 'month'].includes(view)) return;
    const dates = view === 'week' ? weekDays(date) : monthDays(date);
    setLoading(true);
    Promise.all(dates.map((day) => request(`/api/bookings/schedule?date=${day}`)))
      .then((items) => setRange(items))
      .finally(() => setLoading(false));
  }, [date, view]);

  const shift = (days) => {
    setDate(addDays(date, days));
  };

  return (
    <>
      <DateBar date={date} setDate={setDate} shift={shift} />
      <div className="segmented">
        <button className={view === 'rooms' ? 'active' : ''} onClick={() => setView('rooms')}>Помещения</button>
        <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>День</button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Неделя</button>
        <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Месяц</button>
        <button onClick={() => go('/my-bookings')}>Мои заявки</button>
      </div>
      {loading ? <p className="muted">Загружаем расписание...</p> : null}
      {view === 'rooms' && halls.map((hall) => <HallCard key={hall.id} hall={hall} date={date} go={go} />)}
      {view === 'day' && <CalendarGrid halls={halls} date={date} go={go} />}
      {['week', 'month'].includes(view) && <CalendarFilter halls={rangeHalls} value={rangeFilter} setValue={setRangeFilter} />}
      {view === 'week' && <RangeCalendar mode="week" days={weekDays(date)} range={range} go={go} filter={rangeFilter} user={user} />}
      {view === 'month' && <RangeCalendar mode="month" days={monthDays(date)} range={range} go={go} filter={rangeFilter} user={user} />}
    </>
  );
}

function CalendarFilter({ halls, value, setValue }) {
  return (
    <section className="calendar-filter card">
      <label>Фильтр
        <select value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="all">Все залы</option>
          <option value="mine">Только свои брони</option>
          {halls.map((hall) => <option key={hall.id} value={`hall:${hall.id}`}>{hall.name}</option>)}
        </select>
      </label>
    </section>
  );
}

function DateBar({ date, setDate, shift }) {
  return (
    <section className="datebar">
      <button className="small-button arrow-button" onClick={() => shift(-1)} aria-label="Предыдущий день"><ChevronLeft size={22} /></button>
      <div><strong>{niceDate(date)}</strong><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <button className="small-button arrow-button" onClick={() => shift(1)} aria-label="Следующий день"><ChevronRight size={22} /></button>
      <button className="small-button today" onClick={() => setDate(todayISO())}>Сегодня</button>
    </section>
  );
}

function HallCard({ hall, date, go }) {
  const approved = hall.bookings.filter((b) => b.status === 'approved');
  const first = approved[0];
  const freeText = approved.length ? `Свободно до ${first.start_time}` : 'Свободно весь день';
  return (
    <article className="card hall-card">
      <div className="card-head">
        <div>
          <h2>{hall.name}</h2>
          <p>{hall.description}</p>
        </div>
        <span className={`badge ${approved.length ? 'busy' : 'free'}`}>{approved.length ? 'Есть бронь' : 'Свободно'}</span>
      </div>
      <p className="free-line">{freeText}</p>
      <div className="slots">
        {hall.bookings.length ? hall.bookings.map((booking) => (
          <div className="slot" key={booking.id}>
            <span>{booking.start_time}-{booking.end_time}</span>
            <strong>{booking.status === 'approved' ? booking.title || 'Занято' : labels[booking.status]}</strong>
            <em className={`dot ${booking.status}`}></em>
          </div>
        )) : <p className="muted">Подтверждённых и ожидающих заявок нет.</p>}
      </div>
      <button className="primary" onClick={() => go(`/new-booking?hall_id=${hall.id}&date=${date}`)}>Забронировать</button>
    </article>
  );
}

function CalendarGrid({ halls, date, go }) {
  const startMinutes = dayStartHour * 60;
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  return (
    <section className="calendar-card card">
      <div className="calendar-title">
        <div>
          <h2>Сетка бронирований</h2>
          <p>{niceDate(date)} · {dayStartHour}:00-{dayEndHour}:00</p>
        </div>
        <span className="badge free">Свободное место можно бронировать</span>
      </div>
      <div className="calendar-scroll" aria-label="Календарная сетка бронирований">
        <div className="calendar-grid" style={{ '--hall-count': halls.length || 1 }}>
          <div className="calendar-corner">Время</div>
          {halls.map((hall) => (
            <button className="calendar-hall" key={hall.id} onClick={() => go(`/new-booking?hall_id=${hall.id}&date=${date}`)}>
              <strong><span className="hall-dot" style={{ backgroundColor: hall.color || '#2563eb' }}></span>{hall.name}</strong>
              <span>{hall.description}</span>
            </button>
          ))}
          <div className="time-column">
            {hourRows.map((hour) => <div className="time-row" key={hour}>{String(hour).padStart(2, '0')}:00</div>)}
          </div>
          {halls.map((hall) => (
            <div className="hall-column" key={hall.id}>
              {hourRows.slice(0, -1).map((hour) => (
                <button
                  className="hour-cell"
                  key={hour}
                  onClick={() => go(`/new-booking?hall_id=${hall.id}&date=${date}&start_time=${String(hour).padStart(2, '0')}:00&end_time=${String(hour + 1).padStart(2, '0')}:00`)}
                  aria-label={`${hall.name}, ${String(hour).padStart(2, '0')}:00`}
                ></button>
              ))}
              {hall.bookings.map((booking) => {
                const top = Math.max(0, ((timeToMinutes(booking.start_time) - startMinutes) / totalMinutes) * 100);
                const height = Math.max(6, ((timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)) / totalMinutes) * 100);
                return (
                  <button
                    className={`booking-block ${booking.status}`}
                    key={booking.id}
                    style={{ top: `${top}%`, height: `${height}%`, '--booking-color': hall.color || '#2563eb' }}
                    title={`${booking.start_time}-${booking.end_time} · ${booking.title}`}
                    onClick={() => go(`/new-booking?hall_id=${hall.id}&date=${date}`)}
                  >
                    <strong>{booking.start_time}-{booking.end_time}</strong>
                    <span>{booking.status === 'approved' ? booking.title || 'Занято' : labels[booking.status]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RangeCalendar({ mode, days, range, go, filter, user }) {
  const byDate = Object.fromEntries(range.map((item) => [item.date, item.halls]));
  const blanks = mode === 'month' ? Array.from({ length: (new Date(`${days[0]}T12:00:00`).getDay() + 6) % 7 }) : [];
  return (
    <section className={`range-calendar card ${mode === 'week' ? 'week-calendar' : 'month-calendar'}`}>
      <div className="calendar-title">
        <div>
          <h2>{mode === 'week' ? 'Неделя' : 'Месяц'}</h2>
          <p>{shortDate(days[0])} - {shortDate(days[days.length - 1])}</p>
        </div>
      </div>
      <div className="range-grid">
        {mode === 'month' && ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <div className="range-weekday" key={day}>{day}</div>)}
        {blanks.map((_, index) => <div className="range-day blank" key={`blank-${index}`}></div>)}
        {days.map((day) => {
          const bookings = (byDate[day] || [])
            .flatMap((hall) => hall.bookings.map((booking) => ({ ...booking, hall_name: hall.name, hall_id: hall.id, hall_color: hall.color })))
            .filter((booking) => filter === 'all' || (filter === 'mine' ? booking.user_id === user.id : booking.hall_id === Number(filter.replace('hall:', ''))));
          return (
            <button className="range-day" key={day} onClick={() => go(`/new-booking?date=${day}`)}>
              <strong>{shortDate(day)}</strong>
              {bookings.length ? bookings.slice(0, mode === 'week' ? 8 : 3).map((booking) => (
                <span className="range-booking" key={booking.id} style={{ '--booking-color': booking.hall_color || '#2563eb' }}>
                  {booking.start_time} {booking.hall_name}
                </span>
              )) : <em>Свободно</em>}
              {mode === 'month' && bookings.length > 3 && <small>+{bookings.length - 3}</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NewBooking({ request, go, setNotice }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({ hall_id: params.get('hall_id') || '', date: params.get('date') || todayISO(), start_time: params.get('start_time') || '12:00', end_time: params.get('end_time') || '13:00', title: '', comment: '' });
  const [error, setError] = useState('');
  useEffect(() => { request('/api/halls').then((data) => setHalls(data.halls)); }, []);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await request('/api/bookings', { method: 'POST', body: JSON.stringify(form) });
      setNotice(data.warning || 'Заявка отправлена и ожидает подтверждения.');
      go('/my-bookings');
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>Новая заявка</h2>
      <label>Помещение<select value={form.hall_id} onChange={(e) => update('hall_id', e.target.value)}><option value="">Выберите зал</option>{halls.map((hall) => <option value={hall.id} key={hall.id}>{hall.name}</option>)}</select></label>
      <label>Дата<input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label>
      <div className="two-cols"><label>Начало<input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} /></label><label>Конец<input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} /></label></div>
      <label>Название мероприятия<input value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
      <label>Комментарий<textarea value={form.comment} onChange={(e) => update('comment', e.target.value)} /></label>
      {error && <div className="error">{error}</div>}
      <button className="primary">Отправить заявку</button>
    </form>
  );
}

function MyBookings({ request, setNotice }) {
  const [bookings, setBookings] = useState([]);
  const load = () => request('/api/bookings').then((data) => setBookings(data.bookings));
  useEffect(load, []);
  const cancel = async (id) => {
    await request(`/api/bookings/${id}/cancel`, { method: 'PATCH', body: '{}' });
    setNotice('Заявка отменена.');
    load();
  };
  return <BookingList bookings={bookings} onCancel={cancel} />;
}

function BookingList({ bookings, onCancel, adminActions }) {
  if (!bookings.length) return <article className="card empty">Заявок пока нет.</article>;
  return bookings.map((booking) => (
    <article className="card booking-card" key={booking.id}>
      <div className="card-head"><div><h2>{booking.title}</h2><p>{booking.hall_name}</p></div><span className={`badge ${booking.status}`}>{labels[booking.status]}</span></div>
      <p><strong>{niceDate(booking.date)}, {booking.start_time}-{booking.end_time}</strong></p>
      {booking.user_name && <p>Заявитель: {booking.user_name}</p>}
      {booking.comment && <p className="soft-box">Комментарий: {booking.comment}</p>}
      {booking.admin_comment && <p className="soft-box">Комментарий администратора: {booking.admin_comment}</p>}
      {adminActions ? adminActions(booking) : !['cancelled', 'rejected'].includes(booking.status) && <button className="secondary" onClick={() => onCancel(booking.id)}>Отменить</button>}
    </article>
  ));
}

function AdminBookings({ request, setNotice }) {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('pending');
  const [comments, setComments] = useState({});
  const load = () => request(`/api/bookings${status ? `?status=${status}` : ''}`).then((data) => setBookings(data.bookings));
  useEffect(load, [status]);
  const act = async (id, action) => {
    await request(`/api/bookings/${id}/${action}`, { method: 'PATCH', body: JSON.stringify({ admin_comment: comments[id] || '' }) });
    setNotice(action === 'approve' ? 'Заявка подтверждена.' : 'Заявка отклонена.');
    load();
  };
  return (
    <>
      <div className="segmented">
        <button className={status === 'pending' ? 'active' : ''} onClick={() => setStatus('pending')}>На рассмотрении</button>
        <button className={!status ? 'active' : ''} onClick={() => setStatus('')}>Все заявки</button>
      </div>
      <BookingList bookings={bookings} adminActions={(booking) => (
        <div className="admin-actions">
          <label>Комментарий администратора<textarea value={comments[booking.id] || ''} onChange={(e) => setComments((prev) => ({ ...prev, [booking.id]: e.target.value }))} /></label>
          <div className="two-cols"><button className="primary" onClick={() => act(booking.id, 'approve')}>Подтвердить</button><button className="secondary danger" onClick={() => act(booking.id, 'reject')}>Отклонить</button></div>
        </div>
      )} />
    </>
  );
}

function AdminHalls({ request, setNotice }) {
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', color: hallColors[0] });
  const load = () => request('/api/halls').then((data) => setHalls(data.halls));
  useEffect(load, []);
  const add = async (e) => {
    e.preventDefault();
    await request('/api/halls', { method: 'POST', body: JSON.stringify(form) });
    setForm({ name: '', description: '', color: hallColors[0] });
    setNotice('Помещение добавлено.');
    load();
  };
  const deactivate = async (id) => {
    await request(`/api/halls/${id}`, { method: 'DELETE' });
    setNotice('Помещение деактивировано.');
    load();
  };
  return (
    <>
      <form className="card form-card compact" onSubmit={add}>
        <h2>Добавить помещение</h2>
        <label>Название<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Описание<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="hall-color-picker">
          <strong>Цвет зала</strong>
          <div className="color-swatches">
            {hallColors.map((color) => (
              <button
                type="button"
                className={form.color === color ? 'selected' : ''}
                key={color}
                style={{ backgroundColor: color }}
                aria-label={`Цвет зала ${color}`}
                onClick={() => setForm({ ...form, color })}
              />
            ))}
          </div>
        </div>
        <button className="primary">Добавить</button>
      </form>
      {halls.map((hall) => (
        <article className="card row-card" key={hall.id}>
          <div>
            <h2><span className="hall-dot" style={{ backgroundColor: hall.color || '#2563eb' }}></span>{hall.name}</h2>
            <p>{hall.description}</p>
          </div>
          <button className="secondary danger" onClick={() => deactivate(hall.id)}>Деактивировать</button>
        </article>
      ))}
    </>
  );
}

function AdminUsers({ request }) {
  const [users, setUsers] = useState([]);
  useEffect(() => { request('/api/users').then((data) => setUsers(data.users)); }, []);
  return users.map((user) => <article className="card row-card" key={user.id}><div><h2>{user.name}</h2><p>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</p><p>Первый вход: {user.created_at}</p><p>Последний вход: {user.last_login_at}</p></div></article>);
}

function BottomNav({ user, route, go }) {
  const items = user.role === 'admin'
    ? [['/schedule', CalendarDays, 'Расписание'], ['/admin/bookings', ClipboardList, 'Заявки'], ['/admin/halls', DoorOpen, 'Помещения'], ['/admin/users', Users, 'Пользователи']]
    : [['/schedule', CalendarDays, 'Расписание'], ['/new-booking', Plus, 'Новая'], ['/my-bookings', ClipboardList, 'Мои заявки']];
  return <nav className="bottom-nav">{items.map(([path, Icon, label]) => <button key={path} className={route.startsWith(path) ? 'active' : ''} onClick={() => go(path)}><Icon size={20} /><span>{label}</span></button>)}</nav>;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
}

createRoot(document.getElementById('root')).render(<App />);

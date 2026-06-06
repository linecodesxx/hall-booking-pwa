import React, { useEffect, useMemo, useState } from 'react';
import { api, getApiError } from '../api';

const s = {
  main: { maxWidth: 980, margin: '0 auto', padding: '18px 14px 80px' },
  tabs: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, margin: '14px 0' },
  tab: (active) => ({ flex: '0 0 auto', border: 0, borderRadius: 999, padding: '11px 13px', background: active ? '#c4a97d' : '#202027', color: active ? '#111' : '#f6efe3', fontWeight: 900 }),
  card: { background: '#17171b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 15, marginBottom: 10 },
  input: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: '#0d0d0f', color: '#f6efe3', marginTop: 8 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  button: { border: 0, borderRadius: 14, padding: '11px 12px', background: '#c4a97d', color: '#111', fontWeight: 900 },
  ghost: { border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '11px 12px', background: 'transparent', color: '#f6efe3', fontWeight: 800 },
  danger: { border: 0, borderRadius: 14, padding: '11px 12px', background: '#532c2c', color: '#ffd8d8', fontWeight: 900 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', minWidth: 520, borderCollapse: 'collapse' },
  thtd: { textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 10 }
};

const tabs = [
  ['pending', 'Заявки'],
  ['approved', 'Подтверждённые'],
  ['rejected', 'Отклонённые'],
  ['rooms', 'Залы'],
  ['users', 'Пользователи']
];

export default function AdminPage() {
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewId, setReviewId] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [roomForm, setRoomForm] = useState({ name: '', description: '', capacity: 0, color: '#c4a97d' });
  const [error, setError] = useState('');

  async function loadAll() {
    setError('');
    try {
      const [bookingsRes, roomsRes, usersRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/rooms'),
        api.get('/users')
      ]);
      setBookings(bookingsRes.data);
      setRooms(roomsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredBookings = useMemo(() => bookings.filter((b) => b.status === tab), [bookings, tab]);

  async function changeStatus(id, status) {
    setError('');
    try {
      await api.patch(`/bookings/${id}/status`, { status, admin_comment: adminComment });
      setReviewId(null);
      setAdminComment('');
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function addRoom(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/rooms', roomForm);
      setRoomForm({ name: '', description: '', capacity: 0, color: '#c4a97d' });
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function deleteRoom(id) {
    if (!window.confirm('Скрыть этот зал?')) return;
    await api.delete(`/rooms/${id}`);
    await loadAll();
  }

  return (
    <main style={s.main}>
      <h1 style={{ margin: 0 }}>Панель администратора</h1>
      <p style={{ margin: '6px 0 0', color: '#bdb4a5' }}>Здесь решается судьба заявок. Мягко, но не без власти.</p>

      <div style={s.tabs}>
        {tabs.map(([key, label]) => <button key={key} style={s.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {error && <p style={{ color: '#ffb7b7' }}>{error}</p>}

      {['pending', 'approved', 'rejected'].includes(tab) && (
        <section>
          {filteredBookings.length === 0 && <div style={s.card}>Записей нет.</div>}
          {filteredBookings.map((booking) => (
            <article key={booking.id} style={{ ...s.card, borderLeft: `6px solid ${booking.room_color || '#c4a97d'}` }}>
              <strong>{booking.title}</strong>
              <div style={{ color: '#bdb4a5', marginTop: 8 }}>
                {booking.room_name} · {booking.date} · {booking.time_from}–{booking.time_to}
              </div>
              <div style={{ marginTop: 8 }}>Пользователь: {booking.user_name}</div>
              {booking.comment && <div style={{ marginTop: 8 }}>Комментарий: {booking.comment}</div>}
              {booking.admin_comment && <div style={{ marginTop: 8, color: '#d9c59f' }}>Ответ: {booking.admin_comment}</div>}

              {tab === 'pending' && reviewId !== booking.id && (
                <button style={{ ...s.ghost, marginTop: 12 }} onClick={() => setReviewId(booking.id)}>Рассмотреть</button>
              )}

              {tab === 'pending' && reviewId === booking.id && (
                <div style={{ marginTop: 12 }}>
                  <textarea style={{ ...s.input, minHeight: 80 }} value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Комментарий администратора" />
                  <div style={{ ...s.grid, marginTop: 10 }}>
                    <button style={s.button} onClick={() => changeStatus(booking.id, 'approved')}>Подтвердить</button>
                    <button style={s.danger} onClick={() => changeStatus(booking.id, 'rejected')}>Отклонить</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {tab === 'rooms' && (
        <section>
          <form style={s.card} onSubmit={addRoom}>
            <h2 style={{ marginTop: 0 }}>Новый зал</h2>
            <label>Название<input style={s.input} value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} /></label>
            <label>Описание<textarea style={{ ...s.input, minHeight: 80 }} value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} /></label>
            <div style={s.grid}>
              <label>Вместимость<input style={s.input} type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} /></label>
              <label>Цвет<input style={s.input} type="color" value={roomForm.color} onChange={(e) => setRoomForm({ ...roomForm, color: e.target.value })} /></label>
            </div>
            <button style={{ ...s.button, marginTop: 12 }}>Добавить зал</button>
          </form>

          {rooms.map((room) => (
            <article key={room.id} style={{ ...s.card, borderLeft: `6px solid ${room.color}` }}>
              <strong>{room.name}</strong>
              <div style={{ color: '#bdb4a5', marginTop: 6 }}>{room.description || 'Без описания'} · {room.capacity} мест</div>
              <button style={{ ...s.danger, marginTop: 10 }} onClick={() => deleteRoom(room.id)}>Скрыть</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'users' && (
        <section style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thtd}>Имя</th>
                <th style={s.thtd}>Роль</th>
                <th style={s.thtd}>Дата создания</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={s.thtd}>{user.name}</td>
                  <td style={s.thtd}>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
                  <td style={s.thtd}>{user.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

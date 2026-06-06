import React, { useEffect, useMemo, useState } from 'react';
import { api, getApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import BookingForm from '../components/BookingForm';

const s = {
  main: { maxWidth: 980, margin: '0 auto', padding: '18px 14px 96px' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  tabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0' },
  tab: (active) => ({ border: 0, borderRadius: 999, padding: 12, background: active ? '#c4a97d' : '#202027', color: active ? '#111' : '#f6efe3', fontWeight: 900 }),
  filters: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  input: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: '#17171b', color: '#f6efe3' },
  card: { background: '#17171b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 15, marginBottom: 10 },
  badge: (status) => ({ display: 'inline-block', padding: '5px 9px', borderRadius: 999, fontSize: 12, fontWeight: 900, background: status === 'approved' ? '#244b37' : status === 'rejected' ? '#532c2c' : '#51482d', color: '#fff' }),
  fab: { position: 'fixed', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom))', border: 0, borderRadius: 999, padding: '16px 18px', background: '#c4a97d', color: '#111', fontWeight: 1000, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' },
  danger: { border: 0, borderRadius: 12, padding: '9px 12px', background: '#532c2c', color: '#ffd8d8', fontWeight: 800, marginTop: 10 }
};

const statusText = { pending: 'Ожидает', approved: 'Подтверждена', rejected: 'Отклонена' };

export default function BookingsPage() {
  const auth = useAuth();
  const [tab, setTab] = useState('schedule');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  async function loadRooms() {
    const response = await api.get('/rooms');
    setRooms(response.data);
  }

  async function loadBookings() {
    const params = {};
    if (date) params.date = date;
    if (roomId) params.room_id = roomId;
    const response = await api.get('/bookings', { params });
    setBookings(response.data);
  }

  useEffect(() => {
    loadRooms().catch((err) => setError(getApiError(err)));
  }, []);

  useEffect(() => {
    loadBookings().catch((err) => setError(getApiError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, roomId]);

  const visibleBookings = useMemo(() => {
    if (tab === 'schedule') return bookings.filter((b) => b.status === 'approved');
    return bookings.filter((b) => b.user_id === auth.user.id);
  }, [tab, bookings, auth.user.id]);

  async function createBooking(payload) {
    await api.post('/bookings', payload);
    await loadBookings();
  }

  async function cancelBooking(id) {
    if (!window.confirm('Отменить эту заявку?')) return;
    await api.delete(`/bookings/${id}`);
    await loadBookings();
  }

  return (
    <main style={s.main}>
      <div style={s.top}>
        <div>
          <h1 style={{ margin: 0 }}>Залы</h1>
          <p style={{ margin: '6px 0 0', color: '#bdb4a5' }}>Мирно бронируйте помещения, пока календарь ещё покорен порядку.</p>
        </div>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'schedule')} onClick={() => setTab('schedule')}>Расписание</button>
        <button style={s.tab(tab === 'mine')} onClick={() => setTab('mine')}>Мои заявки</button>
      </div>

      <div style={s.filters}>
        <input style={s.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select style={s.input} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">Все залы</option>
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </div>

      {error && <p style={{ color: '#ffb7b7' }}>{error}</p>}

      {visibleBookings.length === 0 && (
        <div style={s.card}>Пока записей нет.</div>
      )}

      {visibleBookings.map((booking) => (
        <article key={booking.id} style={{ ...s.card, borderLeft: `6px solid ${booking.room_color || '#c4a97d'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>{booking.title}</strong>
            <span style={s.badge(booking.status)}>{statusText[booking.status]}</span>
          </div>
          <div style={{ color: '#bdb4a5', marginTop: 8 }}>{booking.room_name} · {booking.date} · {booking.time_from}–{booking.time_to}</div>
          {tab === 'mine' && booking.comment && <div style={{ marginTop: 8 }}>Комментарий: {booking.comment}</div>}
          {tab === 'mine' && booking.admin_comment && <div style={{ marginTop: 8, color: '#d9c59f' }}>Ответ администратора: {booking.admin_comment}</div>}
          {tab === 'mine' && booking.status === 'pending' && <button style={s.danger} onClick={() => cancelBooking(booking.id)}>Отменить</button>}
        </article>
      ))}

      <button style={s.fab} onClick={() => setFormOpen(true)}>+ Забронировать</button>

      {formOpen && <BookingForm rooms={rooms} initialDate={date} onClose={() => setFormOpen(false)} onSubmit={createBooking} />}
    </main>
  );
}

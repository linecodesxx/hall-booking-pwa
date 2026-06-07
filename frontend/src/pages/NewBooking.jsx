import { useEffect, useState } from 'react';
import { todayISO } from '../utils';

export function NewBooking({ request, go, setNotice, user }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({ hall_id: params.get('hall_id') || '', date: params.get('date') || todayISO(), start_time: params.get('start_time') || '12:00', end_time: params.get('end_time') || '13:00', title: '', comment: '' });
  const [error, setError] = useState('');
  useEffect(() => { request('/api/halls').then((data) => setHalls(data.halls || [])).catch(() => {}); }, []);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isAdmin = user?.role === 'admin';
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await request('/api/bookings', { method: 'POST', body: JSON.stringify(form) });
      setNotice(data.warning || (isAdmin ? 'Бронь создана.' : 'Заявка отправлена и ожидает подтверждения.'));
      go(isAdmin ? '/admin/bookings' : '/my-bookings');
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>{isAdmin ? 'Новая бронь' : 'Новая заявка'}</h2>
      <label>Помещение<select value={form.hall_id} onChange={(e) => update('hall_id', e.target.value)}><option value="">Выберите зал</option>{(halls || []).map((hall) => <option value={hall.id} key={hall.id}>{hall.name}</option>)}</select></label>
      <label>Дата<input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label>
      <div className="two-cols"><label>Начало<input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} /></label><label>Конец<input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} /></label></div>
      <label>Название мероприятия<input value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
      <label>Комментарий<textarea value={form.comment} onChange={(e) => update('comment', e.target.value)} /></label>
      {error && <div className="error">{error}</div>}
      <button className="primary">{isAdmin ? 'Создать бронь' : 'Отправить заявку'}</button>
    </form>
  );
}

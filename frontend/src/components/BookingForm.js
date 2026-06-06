import React, { useState } from 'react';
import { getApiError } from '../api';

const s = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.58)', zIndex: 50,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
  },
  sheet: {
    width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto',
    background: '#17171b', color: '#f6efe3', borderRadius: '26px 26px 0 0',
    padding: '18px 16px calc(18px + env(safe-area-inset-bottom))',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  label: { display: 'block', margin: '12px 0', fontWeight: 800 },
  input: {
    marginTop: 7, width: '100%', boxSizing: 'border-box', padding: 13, borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)', background: '#0d0d0f', color: '#f6efe3', fontSize: 16
  },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 },
  primary: { border: 0, borderRadius: 16, padding: 14, background: '#c4a97d', color: '#111', fontWeight: 900 },
  secondary: { border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, background: 'transparent', color: '#f6efe3', fontWeight: 800 },
  error: { padding: 12, borderRadius: 14, background: 'rgba(210,77,77,0.14)', color: '#ffb7b7' }
};

export default function BookingForm({ rooms, initialDate, onClose, onSubmit }) {
  const [form, setForm] = useState({
    room_id: rooms[0]?.id || '',
    title: '',
    date: initialDate || new Date().toISOString().slice(0, 10),
    time_from: '09:00',
    time_to: '10:00',
    comment: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (form.time_to <= form.time_from) {
      setError('Время окончания должно быть позже времени начала.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.backdrop} onClick={onClose}>
      <form style={s.sheet} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ margin: '0 0 6px' }}>Новая заявка</h2>
        <p style={{ margin: 0, color: '#bdb4a5' }}>Заполните детали. Администратор рассмотрит заявку.</p>

        {error && <div style={s.error}>{error}</div>}

        <label style={s.label}>
          Зал
          <select style={s.input} value={form.room_id} onChange={(e) => setField('room_id', e.target.value)}>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>

        <label style={s.label}>
          Название*
          <input style={s.input} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Например, репетиция хора" />
        </label>

        <label style={s.label}>
          Дата*
          <input style={s.input} type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
        </label>

        <div style={s.row}>
          <label style={s.label}>
            С*
            <input style={s.input} type="time" value={form.time_from} onChange={(e) => setField('time_from', e.target.value)} />
          </label>
          <label style={s.label}>
            До*
            <input style={s.input} type="time" value={form.time_to} onChange={(e) => setField('time_to', e.target.value)} />
          </label>
        </div>

        <label style={s.label}>
          Комментарий
          <textarea style={{ ...s.input, minHeight: 88, resize: 'vertical' }} value={form.comment} onChange={(e) => setField('comment', e.target.value)} placeholder="Что важно знать администратору?" />
        </label>

        <div style={s.actions}>
          <button style={s.secondary} type="button" onClick={onClose}>Закрыть</button>
          <button style={s.primary} disabled={loading}>{loading ? 'Отправляем...' : 'Отправить'}</button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BookingList } from '../components';

export function AdminBookings({ request, setNotice }) {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('pending');
  const [comments, setComments] = useState({});
  const load = () => request(`/api/bookings${status ? `?status=${status}` : ''}`).then((data) => setBookings(data.bookings || [])).catch(() => {});
  useEffect(() => { load(); }, [status]);
  const act = async (id, action) => {
    try {
      await request(`/api/bookings/${id}/${action}`, { method: 'PATCH', body: JSON.stringify({ admin_comment: comments[id] || '' }) });
      setNotice(action === 'approve' ? 'Заявка подтверждена.' : 'Заявка отклонена.');
      load();
    } catch {}
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

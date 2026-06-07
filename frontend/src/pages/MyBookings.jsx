import { useEffect, useState } from 'react';
import { BookingList } from '../components';

export function MyBookings({ request, setNotice }) {
  const [bookings, setBookings] = useState([]);
  const load = () => request('/api/bookings').then((data) => setBookings(data.bookings || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const cancel = async (id) => {
    try {
      await request(`/api/bookings/${id}/cancel`, { method: 'PATCH', body: '{}' });
      setNotice('Заявка отменена.');
      load();
    } catch {}
  };
  return <BookingList bookings={bookings} onCancel={cancel} />;
}

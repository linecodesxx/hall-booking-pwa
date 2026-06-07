import { labels } from '../utils';

export function HallCard({ hall, date, go }) {
  const h = hall || {};
  const bookings = h.bookings || [];
  const approved = bookings.filter((b) => b.status === 'approved');
  const first = approved[0];
  const freeText = approved.length ? `Свободно до ${first.start_time}` : 'Свободно весь день';
  return (
    <article className="card hall-card">
      <div className="card-head">
        <div>
          <h2>{h.name}</h2>
          <p>{h.description}</p>
        </div>
        <span className={`badge ${approved.length ? 'busy' : 'free'}`}>{approved.length ? 'Есть бронь' : 'Свободно'}</span>
      </div>
      <p className="free-line">{freeText}</p>
      <div className="slots">
        {bookings.length ? bookings.map((booking) => (
          <div className="slot" key={booking.id}>
            <span>{booking.start_time}-{booking.end_time}</span>
            <strong>{booking.status === 'approved' ? booking.title || 'Занято' : labels[booking.status]}</strong>
            <em className={`dot ${booking.status}`}></em>
          </div>
        )) : <p className="muted">Подтверждённых и ожидающих заявок нет.</p>}
      </div>
      <button className="primary" onClick={() => go(`/new-booking?hall_id=${h.id}&date=${date}`)}>Забронировать</button>
    </article>
  );
}

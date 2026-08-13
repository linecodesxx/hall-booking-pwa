import { createPortal } from 'react-dom';
import { niceDate } from '../utils';

export function CellBookingsModal({
  hall,
  date,
  hour,
  bookings,
  onCreateBooking,
  onBookingClick,
  onClose,
}) {
  if (!hall) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <article className="day-bookings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <div className="modal-body">
          <h2>{hall.name}</h2>
          <p className="muted">
            {niceDate(date)} · {String(hour).padStart(2, '0')}:00
          </p>
          {bookings.length ? (
            <div className="day-bookings-list">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  className="day-booking-item"
                  onClick={() => {
                    onBookingClick(booking);
                    onClose();
                  }}
                >
                  <div className="day-booking-item-header">
                    <span className="day-booking-time">
                      {booking.start_time} &ndash; {booking.end_time}
                    </span>
                  </div>
                  <strong>{booking.title || 'Занято'}</strong>
                  {booking.comment && <span className="muted">{booking.comment}</span>}
                  {booking.user_name && <span className="muted">{booking.user_name}</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Нет броней на это время</p>
          )}
          <button className="primary" onClick={onCreateBooking}>
            Создать бронь
          </button>
        </div>
      </article>
    </div>,
    document.body,
  );
}

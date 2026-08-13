import { createPortal } from 'react-dom';
import { niceDate } from '../utils';

export function DayBookingsModal({ date, bookings, onCreateBooking, onBookingClick, onClose }) {
  if (!date) return null;
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
          <h2>{niceDate(date)}</h2>
          {bookings?.length ? (
            <>
              <p className="muted">{bookings.length} бронирований</p>
              <div className="day-bookings-list">
                {bookings.map((booking) => (
                  <button
                    key={booking.id}
                    className={`day-booking-item ${booking.temporal_status}`}
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
                    <div className="day-booking-item-meta">
                      <span
                        className="hall-dot"
                        style={{
                          backgroundColor: booking.hall_color || '#2563eb',
                        }}
                      />
                      <span>{booking.hall_name}</span>
                    </div>
                    {booking.user_name && <span className="muted">{booking.user_name}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Нет броней на этот день</p>
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

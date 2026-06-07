import { shortDate } from '../utils';

export function RangeCalendar({ mode, days, range, go, filter, user }) {
  const byDate = Object.fromEntries(range.map((item) => [item?.date, item?.halls || []]));
  const dayList = days || [];
  const blanks = mode === 'month' ? Array.from({ length: (new Date(`${dayList[0]}T12:00:00`).getDay() + 6) % 7 }) : [];
  const monthName = dayList[0] ? new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(`${dayList[0]}T12:00:00`)) : '';
  return (
    <section className={`range-calendar card ${mode === 'week' ? 'week-calendar' : 'month-calendar'}`}>
      <div className="calendar-title">
        <div>
          <h2>{mode === 'week' ? 'Неделя' : monthName}</h2>
          <p>          {shortDate(dayList[0])} - {shortDate(dayList[dayList.length - 1])}</p>
        </div>
      </div>
      <div className="range-grid">
        {mode === 'month' && ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <div className="range-weekday" key={day}>{day}</div>)}
        {blanks.map((_, index) => <div className="range-day blank" key={`blank-${index}`}></div>)}
        {dayList.map((day) => {
          const bookings = (byDate[day] || [])
            .flatMap((hall) => (hall?.bookings || []).map((booking) => ({ ...booking, hall_name: hall?.name, hall_id: hall?.id, hall_color: hall?.color })))
            .filter((booking) => filter === 'all' || (filter === 'mine' ? booking.user_id === user.id : booking.hall_id === Number(filter.replace('hall:', ''))));
          return (
            <button className="range-day" key={day} onClick={() => go(`/new-booking?date=${day}`)}>
              <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
              {bookings.length ? bookings.slice(0, mode === 'week' ? 8 : 3).map((booking) => (
                <span className="range-booking" key={booking.id} style={{ '--booking-color': booking.hall_color || '#2563eb' }}>
                  {booking.start_time} {booking.hall_name}
                </span>
              )) : ''}
              {mode === 'month' && bookings.length > 3 && <small>+{bookings.length - 3}</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

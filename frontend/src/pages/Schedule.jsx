import { useEffect, useState } from 'react';
import { CalendarFilter, CalendarGrid, DateBar, HallCard, RangeCalendar } from '../components';
import { addDays, monthDays, todayISO, weekDays } from '../utils';

export function Schedule({ request, go, user }) {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState('rooms');
  const [halls, setHalls] = useState([]);
  const [range, setRange] = useState([]);
  const [rangeFilter, setRangeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const rangeHalls = range.length
    ? Object.values(range.reduce((acc, r) => { (r?.halls || []).forEach((h) => { acc[h.id] = acc[h.id] || h; }); return acc; }, {}))
    : halls;

  const load = () => {
    setLoading(true);
    request(`/api/bookings/schedule?date=${date}`).then((data) => setHalls(data.halls || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  useEffect(() => {
    if (!['week', 'month'].includes(view)) return;
    const dates = view === 'week' ? weekDays(date) : monthDays(date);
    setLoading(true);
    Promise.all(dates.map((day) => request(`/api/bookings/schedule?date=${day}`)))
      .then((items) => setRange(items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, view]);

  const shift = (days) => {
    setDate(addDays(date, days));
  };

  return (
    <>
      <DateBar date={date} setDate={setDate} shift={shift} />
      <div className="segmented">
        <button className={view === 'rooms' ? 'active' : ''} onClick={() => setView('rooms')}>Помещения</button>
        <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>День</button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Неделя</button>
        <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Месяц</button>
        {/* <button onClick={() => go(user.role === 'admin' ? '/admin/bookings' : '/my-bookings')}>{user.role === 'admin' ? 'Все брони' : 'Мои заявки'}</button> */}
      </div>
      {loading ? <p className="muted">Загружаем расписание...</p> : null}
      {view === 'rooms' && (halls || []).map((hall) => <HallCard key={hall.id} hall={hall} date={date} go={go} />)}
      {view === 'day' && <CalendarGrid halls={halls || []} date={date} go={go} />}
      {['week', 'month'].includes(view) && <CalendarFilter halls={rangeHalls || []} value={rangeFilter} setValue={setRangeFilter} />}
      {view === 'week' && <RangeCalendar mode="week" days={weekDays(date)} range={range} go={go} filter={rangeFilter} user={user} />}
      {view === 'month' && <RangeCalendar mode="month" days={monthDays(date)} range={range} go={go} filter={rangeFilter} user={user} />}
    </>
  );
}

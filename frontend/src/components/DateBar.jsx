import { ChevronLeft, ChevronRight } from 'lucide-react';
import { niceDate, todayISO } from '../utils';

export function DateBar({ date, setDate, shift }) {
  return (
    <section className="datebar">
      <button className="small-button arrow-button" onClick={() => shift(-1)} aria-label="Предыдущий день"><ChevronLeft size={22} /></button>
      <div><strong>{niceDate(date)}</strong><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <button className="small-button arrow-button" onClick={() => shift(1)} aria-label="Следующий день"><ChevronRight size={22} /></button>
      {/* <button className="small-button today" onClick={() => setDate(todayISO())}>Сегодня</button> */}
    </section>
  );
}

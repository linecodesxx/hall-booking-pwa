import { ChevronLeft, ChevronRight } from 'lucide-react';

export function DateBar({ shift, goToday }) {
  return (
    <section className="datebar datebar-arrows">
      <button
        className="small-button arrow-button"
        onClick={() => shift(-1)}
        aria-label="Предыдущий день"
      >
        <ChevronLeft size={22} />
      </button>
      <button className="small-button today" onClick={goToday}>
        Сегодня
      </button>
      <button
        className="small-button arrow-button"
        onClick={() => shift(1)}
        aria-label="Следующий день"
      >
        <ChevronRight size={22} />
      </button>
    </section>
  );
}

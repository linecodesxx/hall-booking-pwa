export function CalendarFilter({ halls, value, setValue }) {
  const items = halls || [];
  return (
    <section className="calendar-filter card">
      <label>
        Фильтр
        <select value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="all">Все залы</option>
          <option value="mine">Только свои брони</option>
          {items.map((hall) => (
            <option key={hall.id} value={`hall:${hall.id}`}>
              {hall.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

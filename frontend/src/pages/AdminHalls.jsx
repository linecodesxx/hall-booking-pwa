import { useEffect, useState } from 'react';
import { hallColors } from '../utils';

export function AdminHalls({ request, setNotice }) {
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', color: hallColors[0] });
  const load = () => request('/api/halls').then((data) => setHalls(data.halls || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    try {
      await request('/api/halls', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', description: '', color: hallColors[0] });
      setNotice('Помещение добавлено.');
      load();
    } catch {}
  };
  const deactivate = async (id) => {
    try {
      await request(`/api/halls/${id}`, { method: 'DELETE' });
      setNotice('Помещение деактивировано.');
      load();
    } catch {}
  };
  return (
    <>
      <form className="card form-card compact" onSubmit={add}>
        <h2>Добавить помещение</h2>
        <label>Название<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Описание<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="hall-color-picker">
          <strong>Цвет зала</strong>
          <div className="color-swatches">
            {hallColors.map((color) => (
              <button
                type="button"
                className={form.color === color ? 'selected' : ''}
                key={color}
                style={{ backgroundColor: color }}
                aria-label={`Цвет зала ${color}`}
                onClick={() => setForm({ ...form, color })}
              />
            ))}
          </div>
        </div>
        <button className="primary">Добавить</button>
      </form>
      {(halls || []).map((hall) => (
        <article className="card row-card" key={hall.id}>
          <div>
            <h2><span className="hall-dot" style={{ backgroundColor: hall.color || '#2563eb' }}></span>{hall.name}</h2>
            <p>{hall.description}</p>
          </div>
          <button className="secondary danger" onClick={() => deactivate(hall.id)}>Деактивировать</button>
        </article>
      ))}
    </>
  );
}

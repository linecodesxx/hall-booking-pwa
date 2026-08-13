import { useState } from 'react';
import { CardSkeleton, ConfirmModal } from '../components';
import { useCreateHall, useDeactivateHall, useHalls } from '../hooks/useHalls';
import { hallColors } from '../utils';

export function AdminHalls({ setNotice }) {
  const { data: halls = [], isLoading } = useHalls();
  const createHall = useCreateHall();
  const deactivateHall = useDeactivateHall();
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: hallColors[0],
  });
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const add = async (e) => {
    e.preventDefault();
    try {
      await createHall.mutateAsync(form);
      setForm({ name: '', description: '', color: hallColors[0] });
      setNotice('Помещение добавлено.');
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
  };
  const deactivate = async (id) => {
    try {
      await deactivateHall.mutateAsync(id);
      setNotice('Помещение деактивировано.');
    } catch (err) {
      setNotice({ text: err.message, type: 'error' });
    }
  };
  return (
    <>
      <form className="card form-card compact" onSubmit={add}>
        <h2>Добавить помещение</h2>
        <label>
          Название
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Описание
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
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
      {isLoading
        ? [1, 2, 3].map((i) => <CardSkeleton key={i} />)
        : (halls || []).map((hall) => (
            <article className="card row-card" key={hall.id}>
              <div>
                <h2>
                  <span
                    className="hall-dot"
                    style={{ backgroundColor: hall.color || '#2563eb' }}
                  ></span>
                  {hall.name}
                </h2>
                <p>{hall.description}</p>
              </div>
              <button className="secondary danger" onClick={() => setConfirmDeactivate(hall.id)}>
                Деактивировать
              </button>
            </article>
          ))}
      {confirmDeactivate && (
        <ConfirmModal
          title="Деактивировать помещение"
          message="Вы уверены, что хотите деактивировать это помещение?"
          confirmLabel="Деактивировать"
          danger
          onConfirm={() => {
            const id = confirmDeactivate;
            setConfirmDeactivate(null);
            deactivate(id);
          }}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </>
  );
}

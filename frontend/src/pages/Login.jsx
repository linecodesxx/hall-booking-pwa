import { useState } from 'react';
import { api } from '../lib/api';

export function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Введите имя');
    if (!password) return setError('Введите пароль');
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, password, code }),
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login">
      <section className="login-card">
        <div className="brand-mark">БЗ</div>
        <h1>Бронирование залов</h1>
        <p>Первый вход: имя, инвайт-код и пароль. Потом входите по имени и паролю.</p>
        <form onSubmit={submit}>
          <label>
            Ваше имя
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label>
            Пароль
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            Инвайт-код
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="password"
              autoComplete="one-time-code"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}

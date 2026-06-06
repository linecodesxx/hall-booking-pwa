import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getApiError } from '../api';
import { useAuth } from '../context/AuthContext';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'radial-gradient(circle at top, #2c261b 0, #0d0d0f 50%)'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#17171b',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 28,
    padding: 24,
    boxShadow: '0 24px 80px rgba(0,0,0,0.35)'
  },
  h1: { margin: '0 0 8px', fontSize: 30 },
  p: { margin: '0 0 22px', color: '#bdb4a5', lineHeight: 1.5 },
  label: { display: 'block', marginBottom: 14, color: '#e7dece', fontWeight: 700 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 8,
    padding: '14px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)',
    background: '#0d0d0f',
    color: '#f6efe3',
    fontSize: 16
  },
  button: {
    width: '100%',
    border: 0,
    borderRadius: 16,
    padding: '15px 16px',
    background: '#c4a97d',
    color: '#111',
    fontWeight: 900,
    fontSize: 16
  },
  error: {
    background: 'rgba(210,77,77,0.14)',
    color: '#ffb7b7',
    border: '1px solid rgba(210,77,77,0.3)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14
  }
};

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await auth.login(name, inviteCode);
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.h1}>Добро пожаловать</h1>
        <p style={styles.p}>Введите имя и код доступа, чтобы бронировать залы и видеть расписание.</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>
          Имя
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Анна" />
        </label>

        <label style={styles.label}>
          Код доступа
          <input style={styles.input} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Код из приглашения" type="password" />
        </label>

        <button style={styles.button} disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </main>
  );
}

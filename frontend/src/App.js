import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import BookingsPage from './pages/BookingsPage';
import AdminPage from './pages/AdminPage';

const styles = {
  app: {
    minHeight: '100vh',
    background: '#0d0d0f',
    color: '#f6efe3',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'rgba(13,13,15,0.94)',
    backdropFilter: 'blur(10px)',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  headerInner: {
    maxWidth: 980,
    margin: '0 auto',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { fontWeight: 800, letterSpacing: 0.2 },
  nav: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 },
  link: { color: '#f6efe3', textDecoration: 'none' },
  button: {
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'transparent',
    color: '#f6efe3',
    borderRadius: 999,
    padding: '8px 10px'
  }
};

function ProtectedRoute({ children, adminOnly = false }) {
  const auth = useAuth();
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !auth.isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Layout() {
  const auth = useAuth();

  return (
    <div style={styles.app}>
      {auth.isAuthenticated && (
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.title}>Бронирование залов</div>
            <nav style={styles.nav}>
              <Link style={styles.link} to="/">Расписание</Link>
              {auth.isAdmin && <Link style={styles.link} to="/admin">Админ</Link>}
              <button style={styles.button} onClick={auth.logout}>Выйти</button>
            </nav>
          </div>
        </header>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}

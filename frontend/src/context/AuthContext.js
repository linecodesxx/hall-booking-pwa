import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setOnUnauthorized } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    setOnUnauthorized(logout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(name, inviteCode) {
    const response = await api.post('/auth/login', { name, inviteCode });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    login,
    logout
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

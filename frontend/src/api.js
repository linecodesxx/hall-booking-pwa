import axios from 'axios';

export const api = axios.create({
  baseURL: '/api'
});

let onUnauthorized = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

export function getApiError(error) {
  return error?.response?.data?.message || 'Произошла ошибка. Попробуйте ещё раз.';
}

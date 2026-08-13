export const API = import.meta.env.VITE_API_URL || '';
export const labels = {
  pending: 'Ожидает подтверждения',
  approved: 'Подтверждено',
  rejected: 'Отклонено',
  cancelled: 'Отменено',
};
export const dayStartHour = 8;
export const dayEndHour = 22;
export const hourRows = Array.from(
  { length: dayEndHour - dayStartHour + 1 },
  (_, index) => dayStartHour + index,
);
export const hallColors = [
  '#2563eb',
  '#20a36b',
  '#f59e0b',
  '#e11d48',
  '#7c3aed',
  '#0f766e',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
  '#65a30d',
  '#9333ea',
];

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const niceDate = (date) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(
    new Date(`${date}T12:00:00`),
  );

export const toISO = (date) => date.toISOString().slice(0, 10);

export const addDays = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return toISO(next);
};

export const startOfWeek = (date) => {
  const current = new Date(`${date}T12:00:00`);
  const offset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  current.setDate(current.getDate() + offset);
  return toISO(current);
};

export const weekDays = (date) =>
  Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));

export const monthDays = (date) => {
  const current = new Date(`${date}T12:00:00`);
  const _first = new Date(current.getFullYear(), current.getMonth(), 1, 12);
  const last = new Date(current.getFullYear(), current.getMonth() + 1, 0, 12);
  return Array.from({ length: last.getDate() }, (_, index) =>
    toISO(new Date(current.getFullYear(), current.getMonth(), index + 1, 12)),
  );
};

export const shortDate = (date) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
    new Date(`${date}T12:00:00`),
  );

export const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function urlBase64ToUint8Array(str) {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const tokenStore = {
  get: () => localStorage.getItem('token'),
  set: (token) => localStorage.setItem('token', token),
  clear: () => {
    localStorage.removeItem('token');
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key.includes('api')).map((key) => caches.delete(key))),
        );
    }
  },
};

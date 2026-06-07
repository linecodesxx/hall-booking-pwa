import cors from 'cors';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db, findApprovedConflict, findPendingOverlap, initDb } from './db.js';

dotenv.config();
await initDb();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const forbidden = (message = 'Недостаточно прав') => Object.assign(new Error(message), { status: 403 });
const hallColors = ['#2563eb', '#20a36b', '#f59e0b', '#e11d48', '#7c3aed', '#0f766e', '#ea580c', '#0891b2', '#be123c', '#4f46e5', '#65a30d', '#9333ea'];

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, role: user.role };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, user) {
  if (!user?.password_hash || !user?.password_salt) return false;
  return hashPassword(password, user.password_salt).hash === user.password_hash;
}

function nextHallColor() {
  const used = new Set(db.prepare('SELECT color FROM halls WHERE color IS NOT NULL').all().map((row) => row.color));
  return hallColors.find((color) => !used.has(color)) || hallColors[0];
}

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(Object.assign(new Error('Нужна авторизация'), { status: 401 }));
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return next(Object.assign(new Error('Сессия истекла. Войдите снова'), { status: 401 }));
  }
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(forbidden());
  return next();
}

function validateBooking(body) {
  const hall_id = Number(body.hall_id);
  if (!hall_id) throw badRequest('Выберите помещение');
  if (!body.date) throw badRequest('Укажите дату');
  if (!body.start_time || !body.end_time) throw badRequest('Укажите время');
  if (body.start_time >= body.end_time) throw badRequest('Время начала должно быть раньше времени окончания');
  if (!String(body.title || '').trim()) throw badRequest('Введите название мероприятия');
  return {
    hall_id,
    date: body.date,
    start_time: body.start_time,
    end_time: body.end_time,
    title: String(body.title).trim(),
    comment: String(body.comment || '').trim()
  };
}

function bookingSelect(where = '', params = []) {
  return db.prepare(`
    SELECT b.*, h.name AS hall_name, h.description AS hall_description, h.color AS hall_color, u.name AS user_name, u.role AS user_role
    FROM bookings b
    JOIN halls h ON h.id = b.hall_id
    JOIN users u ON u.id = b.user_id
    ${where}
    ORDER BY b.date DESC, b.start_time ASC
  `).all(...params);
}

function publicBooking(row, viewer) {
  const own = viewer.id === row.user_id;
  const admin = viewer.role === 'admin';
  return {
    id: row.id,
    hall_id: row.hall_id,
    hall_name: row.hall_name,
    hall_color: row.hall_color,
    title: admin || own ? row.title : row.status === 'approved' ? (row.title || 'Занято') : 'Заявка',
    comment: admin || own ? row.comment : undefined,
    admin_comment: admin || own ? row.admin_comment : undefined,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    user_id: admin || own ? row.user_id : undefined,
    user_name: admin ? row.user_name : undefined,
    created_at: admin || own ? row.created_at : undefined,
    updated_at: admin || own ? row.updated_at : undefined
  };
}

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  if (!name) throw badRequest('Введите имя');
  if (!password) throw badRequest('Введите пароль');

  const roleFromCode = code === process.env.ADMIN_INVITE_CODE ? 'admin' : code === process.env.USER_INVITE_CODE ? 'user' : null;

  const existing = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  let user;
  if (existing) {
    if (existing.password_hash) {
      if (!verifyPassword(password, existing)) throw Object.assign(new Error('Неверное имя или пароль'), { status: 401 });
      const nextRole = roleFromCode || existing.role;
      db.prepare('UPDATE users SET role = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextRole, existing.id);
    } else {
      if (!roleFromCode) throw badRequest('Для первого входа введите инвайт-код');
      const credentials = hashPassword(password);
      db.prepare('UPDATE users SET role = ?, password_hash = ?, password_salt = ?, last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(roleFromCode, credentials.hash, credentials.salt, existing.id);
    }
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  } else {
    if (!roleFromCode) throw badRequest('Для первого входа введите инвайт-код');
    const credentials = hashPassword(password);
    const result = db.prepare('INSERT INTO users (name, role, password_hash, password_salt) VALUES (?, ?, ?, ?)').run(name, roleFromCode, credentials.hash, credentials.salt);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  res.json({ token: signUser(user), user: publicUser(user) });
}));

app.get('/api/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404 });
  res.json({ user: publicUser(user) });
}));

app.get('/api/halls', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ halls: db.prepare('SELECT * FROM halls WHERE is_active = 1 ORDER BY name').all() });
}));

app.post('/api/halls', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const color = hallColors.includes(req.body.color) ? req.body.color : nextHallColor();
  if (!name) throw badRequest('Введите название помещения');
  const result = db.prepare('INSERT INTO halls (name, description, color) VALUES (?, ?, ?)').run(name, description, color);
  res.status(201).json({ hall: db.prepare('SELECT * FROM halls WHERE id = ?').get(result.lastInsertRowid) });
}));

app.delete('/api/halls/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  db.prepare('UPDATE halls SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

app.get('/api/bookings', requireAuth, asyncHandler(async (req, res) => {
  const clauses = [];
  const params = [];
  if (req.user.role !== 'admin') {
    clauses.push('b.user_id = ?');
    params.push(req.user.id);
  }
  ['date', 'status', 'hall_id'].forEach((field) => {
    if (req.query[field]) {
      clauses.push(`b.${field} = ?`);
      params.push(req.query[field]);
    }
  });
  const rows = bookingSelect(clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params);
  res.json({ bookings: rows.map((row) => publicBooking(row, req.user)) });
}));

app.get('/api/bookings/schedule', requireAuth, asyncHandler(async (req, res) => {
  if (!req.query.date) throw badRequest('Укажите дату');
  const halls = db.prepare('SELECT * FROM halls WHERE is_active = 1 ORDER BY name').all();
  const rows = bookingSelect('WHERE b.date = ? AND b.status IN (\'pending\', \'approved\')', [req.query.date]);
  res.json({
    date: req.query.date,
    halls: halls.map((hall) => ({
      ...hall,
      bookings: rows.filter((row) => row.hall_id === hall.id).map((row) => publicBooking(row, req.user))
    }))
  });
}));

app.post('/api/bookings', requireAuth, asyncHandler(async (req, res) => {
  const data = validateBooking(req.body);
  const hall = db.prepare('SELECT * FROM halls WHERE id = ? AND is_active = 1').get(data.hall_id);
  if (!hall) throw badRequest('Выбранное помещение недоступно');
  if (findApprovedConflict(data).length) throw Object.assign(new Error('Это время уже занято. Выберите другое время.'), { status: 409 });
  const pending_conflicts = findPendingOverlap(data).map((row) => publicBooking(row, req.user));
  const result = db.prepare(`
    INSERT INTO bookings (user_id, hall_id, title, comment, date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, data.hall_id, data.title, data.comment, data.date, data.start_time, data.end_time);
  const booking = bookingSelect('WHERE b.id = ?', [result.lastInsertRowid])[0];
  res.status(201).json({ booking: publicBooking(booking, req.user), warning: pending_conflicts.length ? 'На это время уже есть заявка, ожидающая подтверждения. Вы можете отправить заявку, но администратор примет решение.' : null });
}));

app.patch('/api/bookings/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) throw Object.assign(new Error('Заявка не найдена'), { status: 404 });
  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) throw forbidden('Можно отменить только свою заявку');
  if (['cancelled', 'rejected'].includes(booking.status)) throw badRequest('Эту заявку уже нельзя отменить');
  db.prepare('UPDATE bookings SET status = \'cancelled\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ booking: publicBooking(bookingSelect('WHERE b.id = ?', [req.params.id])[0], req.user) });
}));

app.patch('/api/bookings/:id/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) throw Object.assign(new Error('Заявка не найдена'), { status: 404 });
  const conflicts = findApprovedConflict({ ...booking, excludeId: booking.id });
  if (conflicts.length) throw Object.assign(new Error('Нельзя подтвердить: время пересекается с подтверждённой бронью'), { status: 409, conflicts });
  db.prepare('UPDATE bookings SET status = \'approved\', admin_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(String(req.body.admin_comment || '').trim(), req.params.id);
  res.json({ booking: publicBooking(bookingSelect('WHERE b.id = ?', [req.params.id])[0], req.user) });
}));

app.patch('/api/bookings/:id/reject', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) throw Object.assign(new Error('Заявка не найдена'), { status: 404 });
  const comment = String(req.body.admin_comment || '').trim();
  db.prepare('UPDATE bookings SET status = \'rejected\', admin_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(comment, req.params.id);
  res.json({ booking: publicBooking(bookingSelect('WHERE b.id = ?', [req.params.id])[0], req.user) });
}));

app.get('/api/users', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  res.json({ users: db.prepare('SELECT id, name, role, created_at, last_login_at FROM users ORDER BY last_login_at DESC').all() });
}));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Ошибка сервера' : err.message, conflicts: err.conflicts });
});

app.listen(PORT, () => {
  console.log(`Hall booking API running on http://localhost:${PORT}`);
});

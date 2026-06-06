require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDb, normalizeName, hashInviteCode } = require('./db');
const { authMiddleware, adminMiddleware } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Ошибка: JWT_SECRET должен быть задан и быть длиной минимум 32 символа.');
  process.exit(1);
}

initDb();

const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(cors());
app.use(express.json());
app.use(express.static(frontendBuild));

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function isTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ''));
}

function validateBookingInput(body) {
  const room_id = Number(body.room_id);
  const title = String(body.title || '').trim();
  const date = String(body.date || '').trim();
  const time_from = String(body.time_from || '').trim();
  const time_to = String(body.time_to || '').trim();

  if (!room_id) return 'Выберите зал.';
  if (!title) return 'Укажите название бронирования.';
  if (!isDate(date)) return 'Укажите дату в формате YYYY-MM-DD.';
  if (!isTime(time_from) || !isTime(time_to)) return 'Укажите время в формате HH:MM.';
  if (time_to <= time_from) return 'Время окончания должно быть позже времени начала.';

  return null;
}

function hasApprovedConflict({ room_id, date, time_from, time_to, excludeId = null }) {
  let sql = `
    SELECT id FROM bookings
    WHERE room_id = ?
      AND date = ?
      AND status = 'approved'
      AND NOT (time_to <= ? OR time_from >= ?)
  `;
  const params = [room_id, date, time_from, time_to];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  return Boolean(db.prepare(sql).get(...params));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Сервер работает.' });
});

app.post('/api/auth/login', (req, res) => {
  const name = normalizeName(req.body.name);
  const inviteCode = String(req.body.inviteCode || '').trim();

  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Введите имя минимум из 2 символов.' });
  }

  if (!inviteCode) {
    return res.status(400).json({ message: 'Введите код доступа.' });
  }

  let role = null;
  if (inviteCode === process.env.ADMIN_INVITE_CODE) role = 'admin';
  if (inviteCode === process.env.INVITE_CODE) role = 'user';

  if (!role) {
    return res.status(401).json({ message: 'Неверный код доступа.' });
  }

  let user = db.prepare('SELECT id, name, invite_code, role FROM users WHERE lower(name) = lower(?)').get(name);

  if (!user) {
    const result = db.prepare(`
      INSERT INTO users (name, invite_code, role)
      VALUES (?, ?, ?)
    `).run(name, hashInviteCode(inviteCode), role);

    user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    const inviteOk = bcrypt.compareSync(inviteCode, user.invite_code);
    if (!inviteOk && user.role !== role) {
      return res.status(403).json({ message: 'Это имя уже используется с другим кодом доступа.' });
    }

    if (user.role !== 'admin' && role === 'admin') {
      db.prepare('UPDATE users SET role = ?, invite_code = ? WHERE id = ?')
        .run('admin', hashInviteCode(inviteCode), user.id);
      user.role = 'admin';
    }

    user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(user.id);
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

app.get('/api/rooms', authMiddleware, (req, res) => {
  const rooms = db.prepare(`
    SELECT id, name, description, capacity, color, active
    FROM rooms
    WHERE active = 1
    ORDER BY name ASC
  `).all();
  res.json(rooms);
});

app.post('/api/rooms', authMiddleware, adminMiddleware, (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const capacity = Number(req.body.capacity || 0);
  const color = String(req.body.color || '#c4a97d').trim();

  if (!name) {
    return res.status(400).json({ message: 'Укажите название зала.' });
  }

  const result = db.prepare(`
    INSERT INTO rooms (name, description, capacity, color)
    VALUES (?, ?, ?, ?)
  `).run(name, description, capacity, color);

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(room);
});

app.delete('/api/rooms/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('UPDATE rooms SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Зал скрыт.' });
});

app.get('/api/bookings', authMiddleware, (req, res) => {
  const date = String(req.query.date || '').trim();
  const roomId = req.query.room_id ? Number(req.query.room_id) : null;

  const params = [];
  const conditions = [];

  if (date) {
    conditions.push('b.date = ?');
    params.push(date);
  }

  if (roomId) {
    conditions.push('b.room_id = ?');
    params.push(roomId);
  }

  if (req.user.role !== 'admin') {
    conditions.push("(b.user_id = ? OR b.status = 'approved')");
    params.push(req.user.id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const bookings = db.prepare(`
    SELECT b.*, r.name AS room_name, r.color AS room_color, u.name AS user_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN users u ON u.id = b.user_id
    ${where}
    ORDER BY b.date ASC, b.time_from ASC
  `).all(...params);

  res.json(bookings);
});

app.post('/api/bookings', authMiddleware, (req, res) => {
  const validationError = validateBookingInput(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const room_id = Number(req.body.room_id);
  const title = String(req.body.title || '').trim();
  const date = String(req.body.date || '').trim();
  const time_from = String(req.body.time_from || '').trim();
  const time_to = String(req.body.time_to || '').trim();
  const comment = String(req.body.comment || '').trim();

  const room = db.prepare('SELECT id FROM rooms WHERE id = ? AND active = 1').get(room_id);
  if (!room) {
    return res.status(404).json({ message: 'Зал не найден или отключён.' });
  }

  if (hasApprovedConflict({ room_id, date, time_from, time_to })) {
    return res.status(409).json({ message: 'На это время уже есть подтверждённая бронь.' });
  }

  const result = db.prepare(`
    INSERT INTO bookings (user_id, room_id, title, date, time_from, time_to, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, room_id, title, date, time_from, time_to, comment);

  const booking = db.prepare(`
    SELECT b.*, r.name AS room_name, r.color AS room_color, u.name AS user_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN users u ON u.id = b.user_id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(booking);
});

app.delete('/api/bookings/:id', authMiddleware, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Бронь не найдена.' });
  }

  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Можно отменять только свои заявки.' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Бронь удалена.' });
});

app.patch('/api/bookings/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const status = String(req.body.status || '').trim();
  const adminComment = String(req.body.admin_comment || '').trim();

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Статус должен быть approved или rejected.' });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Бронь не найдена.' });
  }

  if (status === 'approved') {
    const conflict = hasApprovedConflict({
      room_id: booking.room_id,
      date: booking.date,
      time_from: booking.time_from,
      time_to: booking.time_to,
      excludeId: booking.id
    });

    if (conflict) {
      return res.status(409).json({ message: 'Нельзя подтвердить: время конфликтует с другой подтверждённой бронью.' });
    }
  }

  db.prepare(`
    UPDATE bookings
    SET status = ?, admin_comment = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, adminComment, booking.id);

  const updated = db.prepare(`
    SELECT b.*, r.name AS room_name, r.color AS room_color, u.name AS user_name
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    JOIN users u ON u.id = b.user_id
    WHERE b.id = ?
  `).get(booking.id);

  res.json(updated);
});

app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, name, role, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json(users);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Маршрут не найден.' });
  }
  const indexPath = path.join(frontendBuild, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ message: 'Маршрут не найден.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер бронирования залов запущен на порту ${PORT}.`);
  });
}

module.exports = app;

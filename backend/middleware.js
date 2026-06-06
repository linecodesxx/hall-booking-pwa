const jwt = require('jsonwebtoken');
const { db } = require('./db');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Нужна авторизация.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Сессия истекла. Войдите снова.' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ разрешён только администратору.' });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminMiddleware
};

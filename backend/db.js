const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'data.sqlite');
const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      capacity INTEGER DEFAULT 0,
      color TEXT DEFAULT '#c4a97d',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      room_id INTEGER REFERENCES rooms(id),
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time_from TEXT NOT NULL,
      time_to TEXT NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'pending',
      admin_comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date_room ON bookings(date, room_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  `);

  const countRooms = db.prepare('SELECT COUNT(*) AS count FROM rooms').get().count;
  if (countRooms === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (name, description, capacity, color)
      VALUES (?, ?, ?, ?)
    `);

    const seedRooms = [
      ['Большой зал', 'Основной зал для богослужений и крупных встреч', 120, '#c4a97d'],
      ['Малый зал', 'Уютная комната для малых групп и занятий', 35, '#8fb3a5'],
      ['Детская комната', 'Помещение для детского служения и семейных встреч', 25, '#b88fa5']
    ];

    const transaction = db.transaction((rooms) => {
      for (const room of rooms) insertRoom.run(...room);
    });
    transaction(seedRooms);
  }
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function hashInviteCode(inviteCode) {
  return bcrypt.hashSync(String(inviteCode), 10);
}

module.exports = {
  db,
  initDb,
  normalizeName,
  hashInviteCode
};

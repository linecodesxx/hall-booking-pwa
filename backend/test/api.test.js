process.env.DB_FILE = ':memory:';
process.env.JWT_SECRET = 'test_jwt_secret_key_at_least_32_chars!!';
process.env.INVITE_CODE = 'USER2024';
process.env.ADMIN_INVITE_CODE = 'ADMIN2024';

const request = require('supertest');
const app = require('../server');
const { db, initDb } = require('../db');

let userToken;
let adminToken;
let roomId;

beforeAll(() => {
  initDb();

  db.prepare("INSERT INTO rooms (name, description, capacity, color) VALUES (?, ?, ?, ?)").run('Main Hall', 'Main test room', 50, '#c4a97d');
  db.prepare("INSERT INTO rooms (name, description, capacity, color) VALUES (?, ?, ?, ?)").run('Small Room', 'Small test room', 10, '#8fb3a5');

  roomId = db.prepare("SELECT id FROM rooms ORDER BY id LIMIT 1").get().id;
});

beforeEach(() => {
  db.exec('DELETE FROM bookings');
  db.exec('DELETE FROM users');
});

function loginAs(name, code) {
  return request(app)
    .post('/api/auth/login')
    .send({ name, inviteCode: code });
}

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in as user with valid invite code', async () => {
    const res = await loginAs('TestUser', 'USER2024');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.name).toBe('TestUser');
    userToken = res.body.token;
  });

  it('logs in as admin with admin code', async () => {
    const res = await loginAs('TestAdmin', 'ADMIN2024');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
    adminToken = res.body.token;
  });

  it('rejects unknown invite code', async () => {
    const res = await loginAs('Hacker', 'WRONG_CODE');
    expect(res.status).toBe(401);
  });

  it('rejects name shorter than 2 chars', async () => {
    const res = await loginAs('A', 'USER2024');
    expect(res.status).toBe(400);
  });

  it('rejects name used with different code', async () => {
    await loginAs('DupeUser', 'USER2024');
    const res = await loginAs('DupeUser', 'SOMETHING_ELSE');
    expect(res.status).toBe(401);
  });

  it('creates admin on admin invite code', async () => {
    const res = await loginAs('NewAdmin', 'ADMIN2024');
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('GET /api/rooms', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('returns room list with auth', async () => {
    const userRes = await loginAs('RoomViewer', 'USER2024');
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userRes.body.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('only returns active rooms', async () => {
    const adminRes = await loginAs('RoomAdmin', 'ADMIN2024');
    const userRes = await loginAs('RoomUser', 'USER2024');

    const r = db.prepare("INSERT INTO rooms (name) VALUES ('ToDelete')").run();

    await request(app)
      .delete(`/api/rooms/${r.lastInsertRowid}`)
      .set('Authorization', `Bearer ${adminRes.body.token}`);

    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userRes.body.token}`);
    expect(res.body.find(r2 => r2.id === r.lastInsertRowid)).toBeFalsy();
  });
});

describe('POST /api/rooms', () => {
  it('allows admin to create a room', async () => {
    const adminRes = await loginAs('RoomCreator', 'ADMIN2024');
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ name: 'New Room', description: 'Desc', capacity: 20, color: '#ff0000' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Room');
  });

  it('rejects non-admin', async () => {
    const userRes = await loginAs('RegularUser', 'USER2024');
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ name: 'Hacked Room' });
    expect(res.status).toBe(403);
  });

  it('rejects room without name', async () => {
    const adminRes = await loginAs('StrictAdmin', 'ADMIN2024');
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ description: 'No name here' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/bookings', () => {
  it('creates a booking', async () => {
    const userRes = await loginAs('Booker', 'USER2024');
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Meeting', date: '2026-06-10', time_from: '10:00', time_to: '11:00' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Meeting');
    expect(res.body.status).toBe('pending');
  });

  it('rejects missing title', async () => {
    const userRes = await loginAs('BadBooker', 'USER2024');
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: '', date: '2026-06-10', time_from: '10:00', time_to: '11:00' });
    expect(res.status).toBe(400);
  });

  it('rejects time_to before time_from', async () => {
    const userRes = await loginAs('TimeTraveller', 'USER2024');
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Bad time', date: '2026-06-10', time_from: '12:00', time_to: '11:00' });
    expect(res.status).toBe(400);
  });

  it('detects conflict with approved booking', async () => {
    const adminRes = await loginAs('AdminApprover', 'ADMIN2024');
    const userRes = await loginAs('FirstBooker', 'USER2024');

    const b1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'First', date: '2026-06-15', time_from: '10:00', time_to: '12:00' });

    await request(app)
      .patch(`/api/bookings/${b1.body.id}/status`)
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ status: 'approved' });

    const b2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Second', date: '2026-06-15', time_from: '11:00', time_to: '13:00' });

    expect(b2.status).toBe(409);
  });

  it('allows non-conflicting booking after approved one', async () => {
    const adminRes = await loginAs('AdminApprover2', 'ADMIN2024');
    const userRes = await loginAs('SecondBooker', 'USER2024');

    const b1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'First', date: '2026-06-20', time_from: '10:00', time_to: '12:00' });

    await request(app)
      .patch(`/api/bookings/${b1.body.id}/status`)
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ status: 'approved' });

    const b2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Second', date: '2026-06-20', time_from: '13:00', time_to: '14:00' });

    expect(b2.status).toBe(201);
  });
});

describe('PATCH /api/bookings/:id/status', () => {
  it('admin can approve a booking', async () => {
    const adminRes = await loginAs('AdminApprover3', 'ADMIN2024');
    const userRes = await loginAs('PendingBooker', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Pending', date: '2026-07-01', time_from: '09:00', time_to: '10:00' });

    const res = await request(app)
      .patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('admin can reject a booking', async () => {
    const adminRes = await loginAs('AdminRejector', 'ADMIN2024');
    const userRes = await loginAs('RejectedBooker', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Reject me', date: '2026-07-02', time_from: '09:00', time_to: '10:00' });

    const res = await request(app)
      .patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ status: 'rejected', admin_comment: 'Not available' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.admin_comment).toBe('Not available');
  });

  it('non-admin cannot change status', async () => {
    const userRes = await loginAs('RegularUser2', 'USER2024');
    const anotherUser = await loginAs('AnotherUser', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Stay pending', date: '2026-07-03', time_from: '09:00', time_to: '10:00' });

    const res = await request(app)
      .patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${anotherUser.body.token}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
  });

  it('rejects unknown status value', async () => {
    const adminRes = await loginAs('StrictAdmin2', 'ADMIN2024');
    const userRes = await loginAs('Normal', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Normal', date: '2026-07-04', time_from: '09:00', time_to: '10:00' });

    const res = await request(app)
      .patch(`/api/bookings/${booking.body.id}/status`)
      .set('Authorization', `Bearer ${adminRes.body.token}`)
      .send({ status: 'maybe' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/bookings/:id', () => {
  it('owner can delete their booking', async () => {
    const userRes = await loginAs('Owner', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Delete me', date: '2026-08-01', time_from: '10:00', time_to: '11:00' });

    const res = await request(app)
      .delete(`/api/bookings/${booking.body.id}`)
      .set('Authorization', `Bearer ${userRes.body.token}`);

    expect(res.status).toBe(200);
  });

  it('other user cannot delete someone else\'s booking', async () => {
    const userRes = await loginAs('Owner2', 'USER2024');
    const intruder = await loginAs('Intruder', 'USER2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Mine', date: '2026-08-02', time_from: '10:00', time_to: '11:00' });

    const res = await request(app)
      .delete(`/api/bookings/${booking.body.id}`)
      .set('Authorization', `Bearer ${intruder.body.token}`);

    expect(res.status).toBe(403);
  });

  it('admin can delete any booking', async () => {
    const userRes = await loginAs('Owner3', 'USER2024');
    const adminRes = await loginAs('AdminDeleter', 'ADMIN2024');

    const booking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ room_id: roomId, title: 'Admin delete', date: '2026-08-03', time_from: '10:00', time_to: '11:00' });

    const res = await request(app)
      .delete(`/api/bookings/${booking.body.id}`)
      .set('Authorization', `Bearer ${adminRes.body.token}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/users', () => {
  it('admin can list users', async () => {
    const adminRes = await loginAs('UserLister', 'ADMIN2024');
    await loginAs('UserOne', 'USER2024');
    await loginAs('UserTwo', 'USER2024');

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminRes.body.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('non-admin cannot list users', async () => {
    const userRes = await loginAs('Regular', 'USER2024');
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userRes.body.token}`);
    expect(res.status).toBe(403);
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});

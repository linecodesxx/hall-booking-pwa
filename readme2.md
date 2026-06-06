# Hall Booking PWA

**Прогрессивное веб-приложение для бронирования залов в закрытой группе.**

---

## Стек

| Слой       | Технологии                                                       |
|------------|------------------------------------------------------------------|
| Фронтенд   | React 18, React Router 6, Axios                                 |
| Бэкенд     | Node.js, Express                                                 |
| БД         | SQLite (better-sqlite3)                                          |
| Авторизация| JWT (30 дней), два уровня — `user` и `admin`                     |
| PWA        | manifest.json, service-worker, standalone-режим, иконки 192/512  |

---

## Архитектура

```
├── backend/
│   ├── server.js     — Express-сервер, маршруты API
│   ├── db.js         — инициализация SQLite, сиды комнат
│   ├── middleware.js  — JWT-аутентификация, проверка админа
│   ├── .env.example  — шаблон конфига
│   └── package.json
├── frontend/
│   ├── public/       — index.html, manifest.json, service-worker.js, иконки
│   └── src/
│       ├── App.js           — корневой компонент, роутинг, Layout
│       ├── api.js           — axios-клиент с перехватчиками 401
│       ├── context/AuthContext.js  — состояние авторизации
│       ├── pages/LoginPage.js     — вход по инвайт-коду
│       ├── pages/BookingsPage.js  — расписание + мои заявки
│       ├── pages/AdminPage.js     — панель администратора
│       └── components/BookingForm.js — bottom-sheet форма
```

---

## API Endpoints

| Метод   | Путь                        | Доступ  | Описание                          |
|---------|-----------------------------|---------|-----------------------------------|
| GET     | `/api/health`               | Все     | Проверка сервера                  |
| POST    | `/api/auth/login`           | Все     | Вход (имя + инвайт-код)           |
| GET     | `/api/rooms`                | Авториз | Список активных залов             |
| POST    | `/api/rooms`                | Админ   | Создание зала                     |
| DELETE  | `/api/rooms/:id`            | Админ   | Мягкое удаление (active = 0)      |
| GET     | `/api/bookings`             | Авториз | Список броней (с фильтрацией)     |
| POST    | `/api/bookings`             | Авториз | Создание заявки                   |
| DELETE  | `/api/bookings/:id`         | Авториз | Отмена своей заявки               |
| PATCH   | `/api/bookings/:id/status`  | Админ   | Подтверждение / отклонение        |
| GET     | `/api/users`                | Админ   | Список пользователей              |

---

## База данных

- **users** — id, name, invite_code (bcrypt), role, created_at
- **rooms** — id, name, description, capacity, color, active (soft delete)
- **bookings** — id, user_id, room_id, title, date, time_from, time_to, comment, status (pending/approved/rejected), admin_comment, created_at, updated_at

Конфликт броней проверяется только по **подтверждённым** заявкам.

---

## Дизайн

- Тёмная тема (`#0d0d0f`/`#17171b`), акцентный цвет `#c4a97d`
- Mobile-first, минимальная ширина 375px
- Bottom-sheet форма бронирования
- Админ-панель с вкладками: заявки / подтверждённые / отклонённые / залы / пользователи

---

## Разработка

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm start        # порт 3001

# Frontend
cd frontend
npm install
npm start        # порт 3000, прокси на /api → 3001
```

## Продакшен

```bash
cd frontend
npm run build

# Запуск через PM2
pm2 start backend/server.js --name hall-booking-api
```

Собранный фронтенд раздаётся статически; API-запросы проксируются на backend через Nginx.

---

## Лицензия

MIT

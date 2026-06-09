# PWA бронирования залов

Полноценное веб-приложение для закрытой группы: пользователи отправляют заявки на бронирование залов, администратор подтверждает или отклоняет их. Фронтенд — React 18, backend — Node.js + Express, база — SQLite через `better-sqlite3`, авторизация — JWT на 30 дней.

## Структура

```text
/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── middleware.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── service-worker.js
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js
│   │   ├── api.js
│   │   ├── context/AuthContext.js
│   │   ├── pages/LoginPage.js
│   │   ├── pages/BookingsPage.js
│   │   ├── pages/AdminPage.js
│   │   └── components/BookingForm.js
│   └── package.json
└── README.md
```

## Локальный запуск

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Во втором терминале:

```bash
cd frontend
npm install
npm start
```

Для разработки React dev server обычно работает на `http://localhost:3000`, backend — на `http://localhost:3001`.

## Установка Node.js 18 на Ubuntu

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v
npm -v
```

## Установка зависимостей

```bash
cd /var/www/hall-booking/backend
npm install

cd /var/www/hall-booking/frontend
npm install
```

## Настройка `.env`

```bash
cd /var/www/hall-booking/backend
cp .env.example .env
nano .env
```

Пример:

```env
PORT=3001
JWT_SECRET=замените_на_очень_длинную_случайную_строку_32_символа_или_больше
INVITE_CODE=AGAPE2026
ADMIN_INVITE_CODE=ADMIN777
DB_FILE=./data.sqlite
```

`INVITE_CODE` используется для обычных пользователей. `ADMIN_INVITE_CODE` создаёт или повышает пользователя до администратора.

## Сборка frontend

```bash
cd /var/www/hall-booking/frontend
npm run build
```

После сборки статические файлы будут лежать в `frontend/build`.

## Запуск backend через PM2

```bash
sudo npm install -g pm2
cd /var/www/hall-booking/backend
pm2 start server.js --name hall-booking-api
pm2 save
pm2 startup
```

Команды управления:

```bash
pm2 status
pm2 logs hall-booking-api
pm2 restart hall-booking-api
```

## Конфиг Nginx

Установите Nginx:

```bash
sudo apt install -y nginx
```

Создайте файл:

```bash
sudo nano /etc/nginx/sites-available/hall-booking
```

Пример конфига, замените `example.org` на свой домен:

```nginx
server {
    listen 80;
    server_name example.org www.example.org;

    root /var/www/hall-booking/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

Активируйте сайт:

```bash
sudo ln -s /etc/nginx/sites-available/hall-booking /etc/nginx/sites-enabled/hall-booking
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS через certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.org -d www.example.org
sudo systemctl status certbot.timer
```

PWA на Android и iOS должна открываться по HTTPS. На iPhone откройте сайт в Safari, нажмите «Поделиться» и выберите «На экран Домой». На Android откройте сайт в Chrome и выберите «Установить приложение» или «Добавить на главный экран».

## Бэкап SQLite

По умолчанию база находится в `backend/data.sqlite`, если `DB_FILE` не изменён.

Создать папку для бэкапов:

```bash
sudo mkdir -p /var/backups/hall-booking
sudo chown $USER:$USER /var/backups/hall-booking
```

Ручной бэкап:

```bash
sqlite3 /var/www/hall-booking/backend/data.sqlite ".backup '/var/backups/hall-booking/data-$(date +%F-%H%M).sqlite'"
```

Сжатый бэкап:

```bash
sqlite3 /var/www/hall-booking/backend/data.sqlite ".backup '/tmp/hall-booking.sqlite'"
gzip -c /tmp/hall-booking.sqlite > "/var/backups/hall-booking/data-$(date +%F-%H%M).sqlite.gz"
rm /tmp/hall-booking.sqlite
```

Восстановление:

```bash
pm2 stop hall-booking-api
cp /var/backups/hall-booking/data-YYYY-MM-DD-HHMM.sqlite /var/www/hall-booking/backend/data.sqlite
pm2 start hall-booking-api
```

## Важные замечания

- JWT живёт 30 дней.
- При ответе API `401` frontend автоматически удаляет токен и отправляет пользователя на `/login`.
- Конфликт бронирования проверяется только с подтверждёнными заявками.
- При подтверждении заявки конфликт проверяется повторно.
- Удаление зала — мягкое: `active = 0`.
- Интерфейс сделан mobile-first и рассчитан на экран шириной 375px.

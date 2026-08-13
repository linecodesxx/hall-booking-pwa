# Hall Booking PWA

Приложение для бронирования помещений. Пользователи создают заявки, администраторы
подтверждают или отклоняют их. Frontend — React/Vite, API — Node.js/Express, база —
файловая SQLite-совместимая `sql.js`.

## Оглавление

- [Как устроен production](#как-устроен-production)
- [Развёртывание без Docker](#развёртывание-без-docker)
  - [1. Сервер и DNS](#1-сервер-и-dns)
  - [2. Системные пакеты и Node.js](#2-системные-пакеты-и-nodejs)
  - [3. Пользователь и каталог приложения](#3-пользователь-и-каталог-приложения)
  - [4. Конфигурация](#4-конфигурация)
  - [5. Зависимости и сборка](#5-зависимости-и-сборка)
  - [6. Запуск через systemd](#6-запуск-через-systemd)
  - [7. Настройка Nginx](#7-настройка-nginx)
  - [8. HTTPS через Certbot](#8-https-через-certbot)
  - [9. Первый администратор](#9-первый-администратор)
- [Обновление](#обновление)
- [Резервные копии и восстановление](#резервные-копии-и-восстановление)
- [Диагностика](#диагностика)
- [Запуск через Docker](#запуск-через-docker)
- [Переменные окружения](#переменные-окружения)
- [Разработка и проверки](#разработка-и-проверки)
- [Безопасность](#безопасность)

## Как устроен production

Основной рекомендуемый вариант пока что не использует Docker:

```text
Браузер
   ↓ HTTPS :443
Nginx
   ├── / и статические файлы → frontend/dist
   ├── /api/*                → Node.js :3001
   └── /ws                   → WebSocket :3001
                                  ↓
                         backend/data/app.db
```

Nginx принимает домен и HTTPS. Node.js слушает только `127.0.0.1:3001` и запускается
как systemd-служба. База хранится на диске сервера независимо от процесса.

## Развёртывание без Docker

Инструкция рассчитана на чистую Ubuntu 24.04 и корневой домен `example.org`.
Во всех командах замените пример домена и email своими значениями.

### 1. Сервер и DNS

Создайте виртуальную машину в Yandex Cloud и назначьте ей статический публичный
IPv4-адрес. Динамический адрес может измениться после остановки ВМ.

В панели регистратора домена откройте управление DNS и добавьте:

```text
Тип: A
Имя: @
Значение: статический публичный IPv4-адрес ВМ
TTL: 300 или значение по умолчанию
```

Для `www.example.org` дополнительно:

```text
Тип: CNAME
Имя: www
Значение: example.org.
```

Некоторые регистраторы вместо `@` ожидают пустое имя или сам домен. Менять
NS-серверы и подключать Yandex Cloud DNS не нужно, если зона уже обслуживается
регистратором. `AAAA` добавляйте только при реально настроенном IPv6.

Проверьте, что DNS уже отдаёт IP вашей ВМ:

```bash
dig +short A example.org
# либо
nslookup example.org
```

В группе безопасности Yandex Cloud разрешите входящие TCP-порты `22`, `80` и `443`.
На самой ВМ настройте firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Порт `3001` наружу открывать нельзя.

### 2. Системные пакеты и Node.js

Установите Nginx, Certbot, Git и инструменты сборки:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git curl ca-certificates \
  build-essential openssl
```

Установите Node.js 22 LTS. Один из вариантов — репозиторий NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

Версия Node.js должна начинаться с `v22`.

### 3. Пользователь и каталог приложения

Создайте отдельного системного пользователя без интерактивного входа:

```bash
sudo useradd --system --create-home --home-dir /opt/hall-booking \
  --shell /usr/sbin/nologin hallbooking
sudo -u hallbooking git clone https://github.com/linecodesxx/hall-booking-pwa.git \
  /opt/hall-booking/app
cd /opt/hall-booking/app
```

Если приватный репозиторий нельзя клонировать от `hallbooking`, клонируйте своим
пользователем, а затем передайте файлы:

```bash
sudo chown -R hallbooking:hallbooking /opt/hall-booking/app
```

### 4. Конфигурация

```bash
sudo -u hallbooking cp backend/.env.example backend/.env
openssl rand -hex 32
openssl rand -hex 16
openssl rand -hex 16
sudoedit backend/.env
```

Первое значение используйте как `JWT_SECRET`, следующие два — как разные invite-коды:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
JWT_SECRET=64_СЛУЧАЙНЫХ_HEX_СИМВОЛА
USER_INVITE_CODE=СЛУЧАЙНЫЙ_КОД_ПОЛЬЗОВАТЕЛЯ
ADMIN_INVITE_CODE=ДРУГОЙ_СЛУЧАЙНЫЙ_КОД
CORS_ORIGIN=https://example.org
APP_TIME_ZONE=Europe/Moscow
DB_FILE=./data/app.db
DOMAIN=example.org
PUSH_ENABLED=false
VAPID_FILE=./data/vapid.json
TRUST_PROXY=1
LOGIN_RATE_LIMIT=50
```

Затем:

```bash
sudo chown hallbooking:hallbooking backend/.env
sudo chmod 600 backend/.env
```

### 5. Зависимости и сборка

Устанавливайте строго версии из lock-файлов:

```bash
sudo -u hallbooking npm --prefix backend ci --omit=dev
sudo -u hallbooking npm --prefix frontend ci
sudo -u hallbooking npm --prefix frontend run build
sudo -u hallbooking mkdir -p backend/data
```

Готовый frontend появится в `/opt/hall-booking/app/frontend/dist`.

Если нужны push-уведомления, до сборки frontend выполните:

```bash
sudo -u hallbooking env VITE_PUSH_ENABLED=true npm --prefix frontend run build
```

и установите `PUSH_ENABLED=true` в `backend/.env`.

### 6. Запуск через systemd

В репозитории есть готовая служба `deploy/systemd/hall-booking.service`:

```bash
sudo cp deploy/systemd/hall-booking.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hall-booking
sudo systemctl status hall-booking --no-pager
curl --fail http://127.0.0.1:3001/api/health
```

Служба работает от пользователя `hallbooking`, перезапускается после ошибки и может
записывать только в `backend/data`. Логи доступны через journald.

### 7. Настройка Nginx

Скопируйте готовый конфиг и замените пример домена:

```bash
cd /opt/hall-booking/app
APP_DOMAIN=example.org
sudo cp deploy/nginx/hall-booking.conf /etc/nginx/sites-available/hall-booking
sudo sed -i "s/example\\.org/${APP_DOMAIN}/g" \
  /etc/nginx/sites-available/hall-booking
sudo ln -s /etc/nginx/sites-available/hall-booking \
  /etc/nginx/sites-enabled/hall-booking
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl --fail http://example.org/api/health
```

Nginx напрямую раздаёт `frontend/dist`, `/api/` проксирует в Node.js, а `/ws` — в
WebSocket backend. Адрес с `www` перенаправляется на основной домен, поэтому у
приложения остаётся один origin и не возникает расхождений CORS. Если на сервере уже
есть другие сайты, не удаляйте их конфиги.

### 8. HTTPS через Certbot

Сертификат можно выпускать только после того, как домен указывает на эту ВМ и HTTP
открывается:

```bash
sudo certbot --nginx -d example.org -d www.example.org \
  --redirect --agree-tos --no-eff-email -m admin@example.org
sudo nginx -t
curl --fail https://example.org/api/health
sudo certbot renew --dry-run
systemctl status certbot.timer --no-pager
```

Если запись `www` не создавалась, уберите `-d www.example.org`.

### 9. Первый администратор

Откройте `https://example.org`, введите имя, пароль и `ADMIN_INVITE_CODE`. После
создания первого администратора замените администраторский код:

```bash
openssl rand -hex 16
sudoedit /opt/hall-booking/app/backend/.env
sudo systemctl restart hall-booking
```

Пользователям передавайте только `USER_INVITE_CODE`.

## Обновление

Сначала сделайте резервную копию. Затем:

```bash
cd /opt/hall-booking/app
sudo systemctl stop hall-booking
sudo -u hallbooking git pull --ff-only
sudo -u hallbooking npm --prefix backend ci --omit=dev
sudo -u hallbooking npm --prefix frontend ci
sudo -u hallbooking npm --prefix frontend run build
sudo systemctl start hall-booking
sudo systemctl reload nginx
curl --fail https://example.org/api/health
```

Если включён push, собирайте frontend с `VITE_PUSH_ENABLED=true`. Не запускайте
несколько backend-процессов: файловая база рассчитана на один экземпляр.

## Резервные копии и восстановление

Создание согласованной копии:

```bash
sudo install -d -m 700 /var/backups/hall-booking
sudo systemctl stop hall-booking
sudo cp /opt/hall-booking/app/backend/data/app.db \
  "/var/backups/hall-booking/app-$(date +%F-%H%M).db"
sudo systemctl start hall-booking
```

Если используются push-уведомления, сохраните и `backend/data/vapid.json`.

Восстановление:

```bash
BACKUP_FILE=/var/backups/hall-booking/app-2026-08-13-1200.db
sudo systemctl stop hall-booking
sudo cp "$BACKUP_FILE" \
  /opt/hall-booking/app/backend/data/app.db
sudo chown hallbooking:hallbooking /opt/hall-booking/app/backend/data/app.db
sudo chmod 600 /opt/hall-booking/app/backend/data/app.db
sudo systemctl start hall-booking
curl --fail http://127.0.0.1:3001/api/health
```

Храните копии вне VPS и периодически проверяйте восстановление.

## Диагностика

```bash
sudo systemctl status hall-booking --no-pager
sudo journalctl -u hall-booking -n 200 --no-pager
curl -i http://127.0.0.1:3001/api/health
sudo nginx -t
sudo tail -n 200 /var/log/nginx/error.log
sudo certbot certificates
ss -lnt | grep -E ':80|:443|:3001'
```

Типичные причины:

- `502 Bad Gateway` — backend не запущен или не слушает `127.0.0.1:3001`;
- frontend даёт `403` — Nginx не может читать `/opt/hall-booking/app/frontend/dist`;
- realtime не работает — изменён блок `/ws` или потеряны Upgrade-заголовки;
- CORS-ошибка — `CORS_ORIGIN` не совпадает с полным HTTPS-адресом;
- Certbot не выпускает сертификат — DNS указывает не на эту ВМ или закрыт порт 80;
- время неверное — неправильно задан `APP_TIME_ZONE`.

## Запуск через Docker

Docker остаётся дополнительным вариантом для локального запуска:

```bash
cp backend/.env.example backend/.env
# задайте секреты и CORS_ORIGIN=http://localhost:8080
docker compose up -d --build
curl --fail http://localhost:8080/api/health
```

Compose публикует приложение только на `127.0.0.1:8080`, а данные хранит в volume
`hall-booking-data`. Не используйте `docker compose down -v`, если не хотите удалить
базу.

## Переменные окружения

| Переменная | Назначение |
|---|---|
| `NODE_ENV` | На сервере — `production` |
| `HOST` | Без Docker — `127.0.0.1`; в контейнере — `0.0.0.0` |
| `PORT` | Порт API, стандартно `3001` |
| `JWT_SECRET` | Секрет сессий, минимум 32 символа в production |
| `USER_INVITE_CODE` | Код регистрации пользователей |
| `ADMIN_INVITE_CODE` | Отдельный код администратора |
| `CORS_ORIGIN` | Полный публичный адрес, например `https://example.org` |
| `APP_TIME_ZONE` | Часовой пояс IANA |
| `DB_FILE` | Путь к базе относительно `backend/` |
| `DOMAIN` | Публичный домен для контакта VAPID |
| `PUSH_ENABLED` | `true` для Web Push |
| `VAPID_FILE` | Путь к приватному push-ключу |
| `TRUST_PROXY` | `1` за одним Nginx; `2` в двухуровневой Docker-схеме |
| `LOGIN_RATE_LIMIT` | Попыток входа с IP за 15 минут |

## Разработка и проверки

```bash
npm run install:all
npm --prefix backend run dev
npm --prefix frontend run dev
```

Перед релизом:

```bash
npm run check
npm audit --prefix backend --omit=dev
npm audit --prefix frontend
```

## Безопасность

- наружу открыты только `22`, `80` и `443`; Node.js привязан к loopback;
- production не запускается без обязательных секретов и корректного CORS;
- API-ответы с пользовательскими данными не кешируются Service Worker;
- пароли хешируются `scrypt`, JWT действует 30 дней;
- вход имеет ограничение частоты запросов;
- `.env`, база и VAPID-ключ не должны попадать в Git;
- владелец установки отвечает за резервирование и требования к персональным данным.

## Лицензия

MIT — см. [LICENSE](LICENSE).

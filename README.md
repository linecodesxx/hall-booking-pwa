# Hall Booking PWA

Приложение для бронирования помещений: пользователи создают заявки, администраторы
подтверждают или отклоняют их. Frontend — React/Vite, API — Node.js/Express,
хранилище — файловая SQLite-совместимая база `sql.js`.

Поддерживаются два способа запуска:

- локально или внутри сети — Docker Compose на `http://localhost:8080`;
- на VPS с доменом — Docker Compose за системным Nginx с HTTPS от Certbot.

## Production: VPS, домен, Nginx и HTTPS

Ниже приведён полный сценарий для чистого Ubuntu 24.04. Вместо `example.org`
используйте свой домен.

### 1. Подготовьте DNS и сервер

Сначала назначьте виртуальной машине постоянный публичный IPv4-адрес. В Yandex
Cloud автоматически выданный адрес нужно сделать статическим в настройках сетевого
интерфейса ВМ. Иначе после остановки ВМ адрес может измениться, а домен перестанет
открываться.

DNS-запись создаётся не на сервере и не в Nginx, а в панели регистратора, у которого
обслуживаются DNS-серверы домена: например, REG.RU, RU-CENTER, Timeweb, Beget или
другого регистратора. Откройте раздел «Управление DNS», «DNS-записи» или «Зона
домена».

Для обычного корневого домена `example.org` добавьте запись:

```text
Тип: A
Имя: @
Значение: статический публичный IPv4-адрес ВМ из Yandex Cloud
TTL: 300 или значение по умолчанию
```

Например, если домен — `mychurch.ru`, а IP сервера — `51.250.10.20`, запись
выглядит так:

```text
@  300  A  51.250.10.20
```

Чтобы адрес с `www` тоже работал, дополнительно создайте CNAME:

```text
www  300  CNAME  example.org.
```

Некоторые регистраторы вместо `@` ожидают пустое поле или полный домен. Не меняйте
NS-серверы и не подключайте Yandex Cloud DNS, если DNS уже обслуживается
регистратором — достаточно записи `A` в существующей зоне. Поддомен нужен только
если на корневом домене уже работает другой сайт.

Запись `AAAA` создавайте только при наличии настроенного статического публичного
IPv6 на сервере. Ошибочная `AAAA` может привести к тому, что часть пользователей не
сможет открыть сайт.

Изменения DNS применяются не мгновенно. Обычно это занимает несколько минут, но
из-за кешей может потребоваться до указанного регистратором срока. До выпуска
сертификата проверьте запись с вашего компьютера:

```bash
dig +short A example.org
# либо, если dig не установлен:
nslookup example.org
```

В ответе должен быть именно статический публичный IP вашей ВМ. Пока домен указывает
на другой адрес, переходить к Certbot нельзя.

Откройте только SSH, HTTP и HTTPS. Порт `8080` наружу открывать не нужно:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 2. Установите Docker, Nginx и Certbot

Установите Docker Engine и Compose Plugin по инструкции вашей ОС, затем:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git openssl
sudo systemctl enable --now docker nginx
docker --version
docker compose version
```

Пользователь, выполняющий развёртывание, должен иметь доступ к Docker. Можно
запускать Docker-команды через `sudo` или добавить пользователя в группу `docker`.

### 3. Скачайте и настройте приложение

```bash
sudo mkdir -p /opt/hall-booking
sudo chown "$USER":"$USER" /opt/hall-booking
git clone YOUR_REPOSITORY_URL /opt/hall-booking/app
cd /opt/hall-booking/app
cp backend/.env.example backend/.env
openssl rand -hex 32
openssl rand -hex 16
openssl rand -hex 16
```

Первая строка генерации предназначена для `JWT_SECRET`, следующие две — для
пользовательского и администраторского invite-кодов. Запишите значения в
`backend/.env`:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=ВСТАВЬТЕ_СЮДА_64_СЛУЧАЙНЫХ_HEX_СИМВОЛА
USER_INVITE_CODE=ОТДЕЛЬНЫЙ_СЛУЧАЙНЫЙ_КОД
ADMIN_INVITE_CODE=ЕЩЁ_ОДИН_ОТДЕЛЬНЫЙ_КОД
CORS_ORIGIN=https://example.org
APP_TIME_ZONE=Europe/Moscow
DB_FILE=./data/app.db
DOMAIN=example.org
PUSH_ENABLED=false
VAPID_FILE=./data/vapid.json
TRUST_PROXY=2
LOGIN_RATE_LIMIT=50
```

`USER_INVITE_CODE` и `ADMIN_INVITE_CODE` обязательно должны различаться.
`APP_TIME_ZONE` — часовой пояс IANA вашей организации.

Защитите файл с секретами и запустите контейнеры:

```bash
chmod 600 backend/.env
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
```

Compose публикует приложение только на `127.0.0.1:8080`, поэтому обойти Nginx и
HTTPS извне нельзя. Backend вообще не публикует отдельный порт.

### 4. Подключите системный Nginx

В репозитории уже есть готовый конфиг
`deploy/nginx/hall-booking.conf`. Скопируйте его и замените домен:

```bash
BOOKING_DOMAIN=example.org
sudo cp deploy/nginx/hall-booking.conf /etc/nginx/sites-available/hall-booking
sudo sed -i "s/booking\\.example\\.org/${BOOKING_DOMAIN}/g" \
  /etc/nginx/sites-available/hall-booking
sudo ln -s /etc/nginx/sites-available/hall-booking \
  /etc/nginx/sites-enabled/hall-booking
sudo nginx -t
sudo systemctl reload nginx
```

В переменной `BOOKING_DOMAIN` укажите свой настоящий домен.
Если `/etc/nginx/sites-enabled/default` перехватывает запросы, отключите его:

```bash
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Проверьте HTTP до выпуска сертификата:

```bash
curl --fail http://example.org/api/health
```

Конфиг отдельно обрабатывает `/ws`, включая заголовки WebSocket Upgrade. Остальные
запросы отправляются во frontend-контейнер, который раздаёт PWA и проксирует `/api` в
backend-контейнер.

### 5. Выпустите HTTPS-сертификат

```bash
sudo certbot --nginx -d example.org -d www.example.org \
  --redirect --agree-tos --no-eff-email -m admin@example.org
```

Замените домен и email. Certbot дополнит Nginx-конфиг SSL-настройками и включит
перенаправление HTTP → HTTPS. Проверьте:

```bash
sudo nginx -t
curl --fail https://example.org/api/health
sudo certbot renew --dry-run
systemctl status certbot.timer
```

После этого откройте `https://example.org`. PWA и браузерные push-уведомления
работают только в безопасном HTTPS-контексте.

Чтобы включить push, установите `PUSH_ENABLED=true` в `backend/.env` и пересоберите
frontend с той же возможностью:

```bash
VITE_PUSH_ENABLED=true docker compose up -d --build
```

Для последующих сборок также передавайте `VITE_PUSH_ENABLED=true` либо запишите
`VITE_PUSH_ENABLED=true` в корневой файл `/opt/hall-booking/app/.env`.

### 6. Создайте первого администратора

Откройте форму входа и зарегистрируйтесь с `ADMIN_INVITE_CODE`. После создания
первого администратора рекомендуется заменить этот код в `backend/.env` и применить
настройку:

```bash
docker compose up -d --force-recreate backend
```

Пользователям передавайте только `USER_INVITE_CODE`.

## Локальный запуск через Docker

```bash
cp backend/.env.example backend/.env
```

Для локального запуска установите `NODE_ENV=development`,
`CORS_ORIGIN=http://localhost:8080`, поменяйте все три секрета и выполните:

```bash
docker compose up -d --build
curl --fail http://localhost:8080/api/health
```

Приложение будет доступно на `http://localhost:8080` только с самого компьютера.
Чтобы открыть его другим устройствам локальной сети, осознанно замените bind в
`docker-compose.yml` с `127.0.0.1:8080:80` на `8080:80` и настройте firewall.

## Обновление production

Сначала создайте резервную копию, затем:

```bash
cd /opt/hall-booking/app
git pull --ff-only
docker compose build --pull
docker compose up -d
docker compose ps
curl --fail https://example.org/api/health
```

Не запускайте несколько экземпляров backend: файловая база рассчитана на один
процесс.

## Резервная копия и восстановление

Создание согласованной копии базы:

```bash
cd /opt/hall-booking/app
mkdir -p backups
docker compose stop backend
docker compose cp backend:/app/data/app.db \
  "backups/app-$(date +%F-%H%M).db"
docker compose start backend
```

Если включены push-уведомления, VAPID-ключ уже находится в том же постоянном volume.
При необходимости отдельно извлеките его:

```bash
docker compose cp backend:/app/data/vapid.json \
  "backups/vapid-$(date +%F-%H%M).json"
```

Восстановление базы:

```bash
docker compose stop backend
docker compose cp backups/app-YYYY-MM-DD-HHMM.db backend:/app/data/app.db
docker compose start backend
curl --fail http://127.0.0.1:8080/api/health
```

Копии нужно хранить вне VPS и периодически проверять восстановление.

## Диагностика

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
curl -i http://127.0.0.1:8080/api/health
sudo nginx -t
sudo tail -n 200 /var/log/nginx/error.log
sudo certbot certificates
```

Типичные причины проблем:

- `502 Bad Gateway` — контейнеры не запущены или frontend unhealthy;
- сайт работает, но realtime нет — в Nginx потеряны WebSocket-заголовки `/ws`;
- CORS-ошибка — `CORS_ORIGIN` не совпадает с полным HTTPS-адресом;
- сертификат не выпускается — DNS ещё не обновился либо закрыты порты 80/443;
- неверное локальное время — ошибочно задан `APP_TIME_ZONE`.

## Запуск без Docker

Требуются Node.js 22 LTS, Nginx и PM2:

```bash
npm run install:all
cp backend/.env.example backend/.env
# настройте backend/.env
npm run build
pm2 start ecosystem.config.js
pm2 save
```

В этом варианте Nginx должен раздавать `frontend/dist`, проксировать `/api/` на
`http://127.0.0.1:3001/api/`, а `/ws` — на `http://127.0.0.1:3001/ws`. За основу
можно взять `deploy/nginx/hall-booking.conf`, заменив общий `proxy_pass` на раздачу
статических файлов.

## Настройки backend

| Переменная | Назначение |
|---|---|
| `NODE_ENV` | На сервере обязательно `production` |
| `JWT_SECRET` | Секрет сессий; в production минимум 32 символа |
| `USER_INVITE_CODE` | Код регистрации пользователя |
| `ADMIN_INVITE_CODE` | Отдельный код регистрации/повышения администратора |
| `CORS_ORIGIN` | Полный публичный origin; несколько значений через запятую |
| `APP_TIME_ZONE` | Часовой пояс IANA, по умолчанию `UTC` |
| `DB_FILE` | Путь к базе относительно `backend/` |
| `DOMAIN` | Публичный домен для контакта VAPID |
| `PUSH_ENABLED` | `true`, чтобы включить Web Push |
| `VAPID_FILE` | Путь к push-ключу; внутри Docker должен быть в `/app/data` |
| `TRUST_PROXY` | `2` для цепочки системный Nginx → контейнерный Nginx |
| `LOGIN_RATE_LIMIT` | Попыток входа с одного IP за 15 минут, стандартно `50` |
| `PORT` | Порт API внутри контейнера, стандартно `3001` |

При первом старте с push backend создаёт `/app/data/vapid.json`. Это приватный ключ: не
коммитьте его и включайте в резервные копии. Если старый ключ когда-либо публиковался,
удалите его и перезапустите backend для выпуска новой пары.

## Разработка и проверки

```bash
npm run install:all
npm --prefix backend run dev
npm --prefix frontend run dev
```

Проверки перед релизом:

```bash
npm run check
npm audit --prefix backend --omit=dev
npm audit --prefix frontend
```

## Безопасность и данные

- API-ответы с пользовательскими данными не кешируются Service Worker.
- Production не запускается без обязательных секретов и корректного CORS.
- Пароли хешируются `scrypt`, JWT действует 30 дней.
- Вход имеет ограничение частоты запросов.
- Порт приложения привязан к loopback, внешний доступ идёт только через Nginx.
- Владелец инсталляции отвечает за доступ, резервирование и местные требования к
  персональным данным.

## Лицензия

MIT — см. [LICENSE](LICENSE).

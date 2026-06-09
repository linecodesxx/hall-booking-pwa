# Полный план: Бесшовное PWA — Бронирование залов

## Цель

- Мгновенные обновления UI при CRUD (без перезагрузки)
- Реальное время между пользователями (WebSocket)
- Push-уведомления (Web Push)
- Оффлайн-чтение расписания
- Убрать ручной load() и prop-drilling

---

## Фаза 1 — TanStack Query (кеш + оптимистичные обновления)

| # | Файл | Что делаем |
|---|---|---|
| 1.1 | frontend/package.json | Добавить @tanstack/react-query |
| 1.2 | frontend/src/lib/queryClient.js | **Новый** — QueryClient (staleTime: 30s, gcTime: 5min, retry: 1) |
| 1.3 | frontend/src/main.jsx | ```Обернуть <App> в <QueryClientProvider>``` |
| 1.4 | frontend/src/hooks/useSchedule.js | **Новый** — useQuery(["schedule", date]) — получение расписания |
| 1.5 | frontend/src/hooks/useBookings.js | **Новый** — хуки для списка броней + мутации: useCancelBooking(), useApproveBooking(), useRejectBooking(), useCreateBooking() — каждая с onMutate/onError для optimistic update |
| 1.6 | frontend/src/hooks/useHalls.js | **Новый** — useQuery(["halls"]), useCreateHall(), useDeactivateHall() |
| 1.7 | frontend/src/App.jsx | Убрать prop-drilling request. Перейти на хуки |
| 1.8 | frontend/src/pages/Schedule.jsx | Заменить request() + load() на useSchedule() |
| 1.9 | frontend/src/pages/NewBooking.jsx | Заменить на useCreateBooking() + redirect |
| 1.10 | frontend/src/pages/MyBookings.jsx | useQuery(["bookings"]) + useCancelBooking() |
| 1.11 | frontend/src/pages/AdminBookings.jsx | useQuery(["bookings", {status:"pending"}]) + approve/reject |
| 1.12 | frontend/src/pages/AdminHalls.jsx | useQuery(["halls"]) + useCreateHall() + useDeactivateHall() |
| 1.13 | frontend/src/pages/Login.jsx | Вынести логин в useAuth или оставить 
equest |

---

## Фаза 2 — WebSocket (реальное время)

| # | Файл | Что делаем |
|---|---|---|
| 2.1 | backend/package.json | Добавить ws |
| 2.2 | backend/server.js | Создать WebSocketServer на том же HTTP-сервере. После мутаций — wss.broadcast({ type, payload }) |
| 2.3 | frontend/src/hooks/useWebSocket.js | **Новый** — подключение к ws://host/ws, auto-reconnect 3s. На события — queryClient. setQueryData() или invalidateQueries() |
| 2.4 | frontend/src/App.jsx | Запустить useWebSocket() при монтировании |

**События WebSocket:**
`
booking.created   → queryClient.setQueryData(["schedule"])
booking.updated   → queryClient.invalidateQueries(["bookings"])
booking.cancelled → queryClient.invalidateQueries(["bookings", "schedule"])
hall.created      → queryClient.invalidateQueries(["halls"])
hall.deactivated  → queryClient.invalidateQueries(["halls"])
`

---

## Фаза 3 — Push-уведомления

| # | Файл | Что делаем |
|---|---|---|
| 3.1 | backend/package.json | Добавить web-push |
| 3.2 | backend/.env | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT |
| 3.3 | backend/db.js | Таблица push_subscriptions (endpoint, keys json, user_id, created_at) |
| 3.4 | backend/server.js | **POST /api/push/subscribe** — сохранить подписку. **POST /api/push/unsubscribe** — удалить. **Отправка пушей** при событиях: approve → автору, reject → автору, новая бронь → админам, cancel → админам |
| 3.5 | frontend/public/service-worker.js | Обработчики: push (показать Notification) и 
otificationclick (открыть/сфокусировать окно) |
| 3.6 | frontend/src/hooks/usePushNotifications.js | **Новый** — запрос Notification.requestPermission(), 
egistration.pushManager.subscribe(), отправка endpoint на бекенд |
| 3.7 | frontend/src/App.jsx | После логина — вызвать usePushNotifications() |

**Матрица пушей:**

| Событие | Кому | Текст |
|---|---|---|
| Новая бронь (pending) | Все админы | «[Имя] запросил(а) бронь [зал] [время]» |
| Бронь подтверждена | Автор | «Ваша бронь на [дата] в [зал] подтверждена» |
| Бронь отклонена | Автор | «Ваша бронь на [дата] в [зал] отклонена: [комментарий]» |
| Бронь отменена автором | Все админы | «[Имя] отменил(а) бронь на [зал] [время]» |

---

## Фаза 4 — Service Worker (оффлайн-чтение)

| # | Файл | Что делаем |
|---|---|---|
| 4.1 | frontend/public/service-worker.js | Стратегия **stale-while-revalidate** для GET /api/* — ответ из кеша, фоном обновить. Кеш hall-booking-api-v1 |

---

## Фаза 5 — Auth Context (опционально)

| # | Файл | Что делаем |
|---|---|---|
| 5.1 | frontend/src/hooks/useAuth.js | **Новый** — React Context с user, login(), logout(), loading |
| 5.2 | frontend/src/App.jsx | <AuthProvider> оборачивает приложение |
| 5.3 | Все страницы | const { user } = useAuth() вместо props.user |

---

## Порядок выполнения

`
Фаза 1 (TanStack Query)
  └─ 1.1 → 1.2 → 1.3 → 1.4-1.6 → 1.7-1.13

Фаза 2 (WebSocket)
  └─ 2.1 → 2.2 → 2.3 → 2.4

Фаза 3 (Push)
  └─ 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7

Фаза 4 (SW offline read)
  └─ 4.1

Фаза 5 (Auth context — опционально)
  └─ 5.1 → 5.2 → 5.3
`

---

## Что получим на выходе

- **Скорость:** переходы между страницами мгновенные (кеш). UI обновляется до ответа сервера (optimistic updates)
- **Реальное время:** изменения от других пользователей приходят через WebSocket за <100ms
- **Push-уведомления:** админы узнают о новых бронях, пользователи — о статусе своих заявок
- **Оффлайн:** расписание и залы доступны без интернета
- **Чистота:** без ручных load(), setLoading, setError. Без prop-drilling

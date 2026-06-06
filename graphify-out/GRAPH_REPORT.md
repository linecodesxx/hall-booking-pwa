# Graph Report - hall-booking-pwa  (2026-06-06)

## Corpus Check
- 22 files · ~7,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 175 nodes · 217 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `Hall Booking PWA` - 14 edges
2. `PWA бронирования залов` - 12 edges
3. `useAuth()` - 9 edges
4. `Hall Booking PWA` - 9 edges
5. `Node.js + Express` - 7 edges
6. `getApiError()` - 6 edges
7. `Entry HTML` - 5 edges
8. `db` - 4 edges
9. `scripts` - 4 edges
10. `scripts` - 4 edges

## Surprising Connections (you probably didn't know these)
- `React 18` --conceptually_related_to--> `Entry HTML`  [INFERRED]
  README.md → frontend/public/index.html
- `BookingsPage()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/pages/BookingsPage.js → frontend/src/context/AuthContext.js
- `Hall Booking PWA` --references--> `Entry HTML`  [EXTRACTED]
  README.md → frontend/public/index.html
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.js → frontend/src/context/AuthContext.js
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.js → frontend/src/context/AuthContext.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Full-Stack Technology Stack** — react_18, node_express, sqlite_better_sqlite3, jwt_auth [EXTRACTED 1.00]
- **Production Deployment Pipeline** — nginx_config, pm2_process_manager, certbot_https, sqlite_backup [INFERRED 0.85]

## Communities (12 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (13): s, rooms, s, tabs, BookingsPage(), s, statusText, api (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (25): bcrypt, Database, db, hashInviteCode(), initDb(), normalizeName(), path, adminMiddleware() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (18): Apple PWA Meta Tags, Auto-Logout on 401, Booking Approval Workflow, Certbot HTTPS, Booking Conflict Detection, Dark Theme (#0d0d0f), Hall Booking PWA, Entry HTML (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, cors, dotenv, express, jsonwebtoken, description (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (23): browserslist, development, production, dependencies, axios, react, react-dom, react-router-dom (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (12): HTTPS через certbot, PWA бронирования залов, Бэкап SQLite, Важные замечания, Запуск backend через PM2, Конфиг Nginx, Локальный запуск, Настройка `.env` (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (9): API Endpoints, Hall Booking PWA, Архитектура, База данных, Дизайн, Лицензия, Продакшен, Разработка (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (13): AuthContext, AuthProvider(), useAuth(), LoginPage(), styles, mockGetApiError, mockLogin, mockNavigate (+5 more)

## Knowledge Gaps
- **100 isolated node(s):** `Database`, `bcrypt`, `path`, `jwt`, `{ db }` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getApiError()` connect `Community 0` to `Community 10`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Database`, `bcrypt`, `path` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09885057471264368 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 10` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
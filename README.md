# My Library — React + Flask + PostgreSQL

> **Guida rapida in italiano per avviarla con Docker Desktop: [AVVIO.md](AVVIO.md)**

A personal book catalogue. It began as a plain HTML/CSS/JavaScript page that kept its data in `localStorage` (Project Module III) and is now a three-tier web application:

| Tier | Technology |
|---|---|
| Presentation | **React 18 + TypeScript** (Vite, React Router, React-Bootstrap, Recharts) |
| Application | **Flask 3** (Flask-SQLAlchemy, Flask-Migrate, Flask-Limiter) |
| Data | **PostgreSQL** |

## Features

**Catalogue** — add, edit, search, filter (genre, loan, reading status) and sort books; import/export JSON with three merge modes.
- **ISBN lookup**: type or **scan** the barcode with the phone camera; title, author, year, pages and cover are filled in from Open Library.
- **Wishlist**: books you do not own yet (they cannot be lent and do not count in the estimates).

**Reading**
- **Reading sessions** (date, minutes, pages) grouped into **readings**, so a book can be **re-read**.
- **Timer**: *Start* on a book, *Stop* when you are done (from the card or the header on any page): the session form opens with the minutes filled in. The timer survives a page reload.
- **Rating** (1–5 stars) for each finished reading, and **notes and quotes** with page numbers.

**Loans** — lend with a **due date**; overdue books are highlighted; borrower names are suggested from past loans; full loan history per book; daily **email reminder** of overdue loans.

**Reports** — time still needed for the unread books (with what-if sliders), time spent on finished books, hours per month, **yearly goal** and **reading streak**, loan statistics.

**Accounts and sharing** — sign up, sign in, **password reset by email**; **shared libraries**: other people join yours with an invite code and see the same books, while readings, ratings and notes stay personal.

**Interface** — **Italian and English** (also for server messages and emails), **dark mode** (automatic or manual), **installable app (PWA)** that opens offline.

**Engineering** — database **migrations**, **rate limiting** on login, **TypeScript**, **tests** for backend (pytest) and frontend (Vitest), **Docker Compose**, **GitHub Actions CI**, **Render** deployment blueprint.

---

## 1. Project structure

```
my-library/
├── backend/
│   ├── app/
│   │   ├── __init__.py      # create_app(): blueprints, CSRF guard, serving the React build
│   │   ├── config.py        # all settings, read from the environment / .env
│   │   ├── extensions.py    # db, migrate, limiter
│   │   │                    # --- core
│   │   ├── models.py        # Library, User, Book, Loan, Reading, ReadingSession, Note
│   │   ├── limits.py        # allowed values and ranges (used by validation and CHECK constraints)
│   │   ├── validation.py    # the single checkpoint for incoming data
│   │   ├── services.py      # changes that touch several tables; the per-user view of a book; import
│   │   ├── access.py        # current user, login_required, "only rows of your library" helpers
│   │   ├── messages.py      # Italian/English texts for API errors and emails
│   │   ├── http.py          # error responses and app-wide error handlers
│   │   ├── security.py      # reverse-proxy headers (ProxyFix), CSP and other security headers
│   │   ├── mail.py          # SMTP, or the log when no mail server is configured
│   │   │                    # --- HTTP endpoints (one blueprint per area)
│   │   ├── auth.py          # /api/auth   register, login, settings, password reset
│   │   ├── library.py       # /api/library  invite codes, join, leave
│   │   ├── books.py         # /api/books  catalogue CRUD, history of one book
│   │   ├── transfer.py      # /api/books/export, /api/books/import
│   │   ├── loans.py         # lend, return, borrower names
│   │   ├── readings.py      # readings (start, finish, rate) and reading sessions
│   │   ├── notes.py         # notes and quotes
│   │   ├── lookup.py        # /api/lookup/isbn  (Open Library)
│   │   ├── reports.py       # /api/reports
│   │   │                    # --- command line
│   │   ├── cli.py           # registers flask create-demo, flask send-reminders
│   │   ├── demo.py          # the demo account and its sample data
│   │   └── reminders.py     # daily email of overdue loans
│   ├── migrations/          # Alembic migrations (Flask-Migrate)
│   ├── tests/               # pytest: accounts, books, reports, security, limits
│   └── requirements.txt
├── frontend/
│   ├── public/              # manifest.webmanifest, sw.js (service worker), icons
│   └── src/
│       ├── App.tsx          # session, language, theme, timer; routes
│       ├── context.ts       # app-wide state shared by every page
│       ├── api.ts           # typed client for the Flask API
│       ├── types.ts         # shapes of the API data
│       ├── i18n.ts          # interface texts, it + en
│       ├── hooks.ts         # useNow (timers), useAppliedTheme, cssVar
│       ├── lib/             # pure helpers (filters, stats, formatting, limits) + their tests
│       ├── pages/           # Auth, Reset, Catalogue, Reports, Settings
│       └── components/      # BookCard, BookModal, BookDetailModal, LendModal, BarcodeScanner, …
│           └── book-detail/ # the three tabs of the detail window: reading, notes, loans
├── scripts/setup.sh|.ps1    # create .env and backend/.env with random secrets
├── AVVIO.md                 # step-by-step start guide, in Italian
├── Dockerfile               # builds the React app, then runs Flask with gunicorn
├── docker-compose.yml       # app + PostgreSQL
├── render.yaml              # one-click deployment on Render
└── .github/workflows/ci.yml # tests, type check and build on every push
```

---

## 2. Running it

### 2.1 With Docker (simplest)
```bash
sh scripts/setup.sh           # creates .env with random secrets (Windows: scripts\setup.ps1)
docker compose up --build     # http://localhost:8000 (bound to this machine only)
docker compose exec app flask --app wsgi create-demo    # optional demo data
```
Migrations run automatically when the container starts. The database is also published on
`localhost:${DB_PORT:-5432}`, so `docker compose up -d db` alone is enough to run Flask outside Docker.

### 2.2 Without Docker
Requirements: Python 3.10+, Node.js 20.19+, PostgreSQL 13+.
```bash
# database (once)
psql -U postgres -c "CREATE USER library PASSWORD 'library';"
psql -U postgres -c "CREATE DATABASE library OWNER library;"

# backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt                   # requirements.txt + pytest
cp .env.example .env                                  # set SECRET_KEY (or run scripts/setup.sh from the root)
flask --app wsgi db upgrade                           # create / update the tables
flask --app wsgi create-demo                          # optional: demo@example.com / demo1234

# frontend
cd ../frontend
npm install
npm run build                                         # writes frontend/dist, served by Flask
cd ../backend && flask --app wsgi run                 # http://localhost:5000
```
**Development with hot reload**: run `flask --app wsgi run --debug` (port 5000) and, in another terminal, `npm run dev` in `frontend/` (port 5173). Vite forwards `/api` to Flask.

### 2.3 Tests
```bash
cd backend && pytest                                   # 29 tests, in-memory SQLite
TEST_DATABASE_URL=postgresql+psycopg://library:library@localhost:5432/library_test pytest
cd frontend && npm test && npm run typecheck           # 13 tests + TypeScript check
```

### 2.4 Commands
| Command | Effect |
|---|---|
| `flask --app wsgi db upgrade` | Apply pending migrations |
| `flask --app wsgi db migrate -m "…"` | Generate a migration after changing `models.py` |
| `flask --app wsgi create-demo` | Demo account with books, readings, notes, loans (one overdue) |
| `flask --app wsgi send-reminders` | Email every member of a library its overdue loans |

Run `send-reminders` once a day, for example with cron:
`0 8 * * * cd /path/to/backend && .venv/bin/flask --app wsgi send-reminders`
(with Docker: `docker compose exec -T app flask --app wsgi send-reminders`).

### 2.5 Configuration
All settings are environment variables (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (`postgres://` URLs from hosting services are accepted) |
| `SECRET_KEY` | Signs login cookies and reset links. **Required in production** |
| `APP_URL` | Public address, used in the links sent by email |
| `SESSION_COOKIE_SECURE` | `1` when served over HTTPS (also enables the HSTS header) |
| `PROXY_COUNT` | Reverse proxies in front of the app (`1` on Render, default `0`): the client IP and scheme are read from `X-Forwarded-*` so rate limits are per client |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_TLS`, `MAIL_FROM` | SMTP. Without `MAIL_SERVER` emails are written to the log |
| `RATELIMIT_STORAGE_URI` | `memory://` by default; `redis://…` with several servers |
| `OPENLIBRARY_URL` | Book lookup service (default `https://openlibrary.org`) |

### 2.6 Deploying on Render
Push the repository to GitHub, then in Render choose **New → Blueprint** and select it. `render.yaml` creates the database and the web service (from the Dockerfile) and generates `SECRET_KEY`. After the first deploy set `APP_URL` to the site address, and the `MAIL_*` variables for real emails. The daily reminder needs a scheduler (a Render Cron Job, or any external cron calling `flask send-reminders`).

### 2.7 Upgrading from the previous version
The schema changed a lot (shared libraries, readings), so there is no in-place migration from version 3. Export JSON from the old version, create the new database with `flask db upgrade`, sign up and **Import JSON**: the importer understands the old file format, including reading status and sessions. From now on, schema changes go through migrations and need no export.

---

## 3. Database

```
libraries 1──* users                       members share one catalogue
libraries 1──* books 1──* loans            loans belong to the physical copy
users ──* readings *── books               one row per reading, so re-reads are possible
            readings 1──* reading_sessions
users ──* notes *── books
```

| Table | Main columns |
|---|---|
| `libraries` | `name`, `invite_code` (unique) |
| `users` | `email` (unique), `password_hash`, `library_id`, `language`, `daily_minutes`, `pages_per_hour`, `yearly_goal` |
| `books` | `library_id`, `title`, `author`, `genre`, `year`, `isbn`, `shelfmark`, `pages`, `cover_url`, `wishlist`, `status`, `borrower` |
| `loans` | `book_id`, `borrower`, `lent_on`, `due_on`, `returned_on` (NULL = still out) |
| `readings` | `user_id`, `book_id`, `started_on`, `finished_on` (NULL = in progress), `rating` |
| `reading_sessions` | `reading_id`, `read_on`, `minutes`, `pages` |
| `notes` | `user_id`, `book_id`, `body`, `is_quote`, `page` |

Every range rule (ratings 1–5, minutes 1–1440, dates in order, allowed statuses and languages) is also a `CHECK` constraint, so not even a manual `INSERT` can store a value the application would reject.

A book's **reading status is not stored**: it is derived for each user from their readings (none → *to read*, one open → *reading*, all finished → *read*; *wishlist* comes from the book). Two members of the same library can therefore be at different points of the same book.

---

## 4. REST API

JSON everywhere. Errors: `{"error": "…"}`, plus `"fields": {…}` with status **422** for validation. Messages are in the language of the `Accept-Language` header. Every `POST/PUT/DELETE` needs `X-Requested-With: fetch`. Rows of another library answer **404**.

| Area | Endpoints |
|---|---|
| Account | `POST /api/auth/register` · `POST /login` · `POST /logout` · `GET/PUT /me` · `POST /forgot` · `POST /reset` |
| Library | `PUT /api/library` (rename) · `POST /invite` (new code) · `POST /join` · `POST /leave` |
| Books | `GET/POST /api/books` · `GET/PUT/DELETE /api/books/<id>` · `GET /api/books/<id>/history` |
| Loans | `POST /api/books/<id>/lend` `{borrower, due_on}` · `POST /api/books/<id>/return` · `GET /api/borrowers` |
| Readings | `POST /api/books/<id>/readings` (start / re-read) · `PUT/DELETE /api/readings/<id>` (finish, reopen, rate) |
| Sessions | `POST /api/books/<id>/sessions` `{read_on, minutes, pages?, finished?, rating?}` · `DELETE /api/sessions/<id>` |
| Notes | `POST /api/books/<id>/notes` `{body, is_quote, page?}` · `DELETE /api/notes/<id>` |
| Lookup | `GET /api/lookup/isbn/<isbn>` |
| Import/export | `GET /api/books/export` · `POST /api/books/import` `{mode: preview|add|update|replace, books}` |
| Reports | `GET /api/reports?daily_minutes=&pages_per_hour=` (`auto` ignores the saved pace) |

Logging a session when no reading is open starts one; `finished: true` closes it on that date. Export files include loans, your readings with their sessions, and your notes; imports restore them for the books they insert.

---

## 5. How the reports are calculated

- **Pace**: your saved pages/hour if set; otherwise measured as pages ÷ minutes over the sessions where pages were entered (used once there are at least 30 such minutes); otherwise 30 pages/hour.
- **Time still to read**: for every owned book you have not read (or are reading) and that has a page count, pages left = pages − pages logged in the open reading. Hours = pages left ÷ pace; days = ⌈hours × 60 ÷ minutes per day⌉. Books without a page count are listed instead of guessed.
- **Finished readings**: total minutes, sessions, calendar days from start to finish, own pages/hour, rating. Re-reads appear as separate rows.
- **Yearly goal**: books finished this year compared with the share of the goal expected by today.
- **Streak**: consecutive days with at least one session, ending today (or yesterday, so the streak is not lost before you read today); plus the longest streak ever.
- **Loans**: an open loan counts up to today; overdue = still out after its due date.

Sums and counts are done in SQL; date arithmetic in Python, so the same code also runs on SQLite in the tests.

---

## 6. Security

- Passwords hashed with scrypt (Werkzeug). Login and password reset answer the same way whether or not the email exists.
- Session cookie: signed, `HttpOnly`, `SameSite=Lax`, `Secure` behind HTTPS.
- **CSRF**: state-changing requests must carry a custom header, which other sites cannot send without a CORS preflight this server never approves.
- **Rate limits**: login 10/minute, registration 10/hour, password reset 5/hour per IP (answers 429).
- **Reset links** are signed, expire after one hour and stop working once the password changes.
- Cover images are accepted only as `https://` URLs.
- **Headers**: every response carries a Content-Security-Policy (scripts only from the app itself), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS over HTTPS.
- Imported years and page counts outside the allowed range are dropped instead of failing the whole import.
- Every query on books, readings and notes is filtered by the user's library and user id; tests check that other users get 404.

---

## 7. Design notes

- **One source of truth**: each page holds what the server returned and derives everything else (stats, filters, progress). Nothing derived is stored, on the server either: minutes read and reading status are computed from the sessions and readings.
- **One checkpoint for incoming data**: `validation.py`, used by forms, imports and the demo data alike. Changes that touch several tables (lending writes the book and a loan row) live only in `services.py`.
- **Messages are keys**: the server raises `ValidationError({"title": "title_required"})`; the text is chosen when the response is built, in the request's language.
- **No libraries where the platform suffices**: barcode scanning uses the browser's `BarcodeDetector`, the service worker is 40 lines, translations are a typed dictionary.
- **Charts**: one series each, in the theme's accent colour read from CSS variables, with a table view next to the loans chart.

### Known limits
- Barcode scanning needs a browser with `BarcodeDetector` (Chrome/Edge, recent Safari); elsewhere the Scan button is hidden and the ISBN can be typed.
- Offline, the app opens but shows that the server cannot be reached: data is never cached, so it is never out of date.
- With several gunicorn workers and `memory://`, each worker keeps its own rate-limit counters; use Redis for exact limits.
- Joining another library is allowed only when yours is empty or shared, so no books are ever moved or lost.

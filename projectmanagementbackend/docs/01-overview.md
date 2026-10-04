# 01 — Project Overview & Feature Map

> What Project Camp is, what the backend provides, and what the frontend will deliver.

## 1. What we have (backend — audited & fixed)

Express 5 + MongoDB (Mongoose 9), ESM. REST API under `/api/v1` with a uniform
envelope `{ success, message, data, meta }` and errors `{ success, message, errors }`.
Full OpenAPI docs at `/api-docs` (port comes from the backend `.env` — `8000` in this repo).

**Recent backend fixes (this sprint):**

| Fix | Detail |
|---|---|
| Email verification added (email OTP) | 6-digit code, sha256-hashed, 10-min expiry, 5 attempts, 60 s resend cooldown. Unverified accounts can't log in (`403 EMAIL_NOT_VERIFIED`); a successful code logs the user straight in. In dev the code is returned as `devOtp` + logged. |
| Auth rate limiting | `express-rate-limit` mounted on register / login / verify-otp / resend-otp / forgot-password. Login and OTP checks count **failures only** (10 per 15 min per IP+account); mail-sending endpoints count every request (5–10 per window). Answers `429 { errors: ['RATE_LIMITED'] }` + `Retry-After`. Set `TRUST_PROXY` when running behind a proxy. |
| Mailtrap → Ethereal | Zero-config dev mail: auto-created Ethereal test account, preview URL logged to console. Generic `SMTP_*` env vars for prod; `MAILTRAP_*` still honored as legacy fallback. |
| Attachments revived | `multer` mounted on `POST /tasks` (`attachments`, max 5 × 1MB, jpeg/png/webp). Was dead code before. |
| Swagger completed | 20 paths fully annotated, shared schemas/responses, refs verified. Previously empty. |
| Error handling hardened | Mongoose ValidationError/CastError/duplicate-key/multer/JSON-parse errors → proper 4xx. |
| Forgot-password hardened | Generic response — no user enumeration. |
| Env template rewritten | `NODE_ENV`, `FRONTEND_URL`, `BCRYPT_SALT_ROUNDS`, `SMTP_*`; removed `[TEMPLATE]` junk + `SMTP_POST` typo era. |

## 2. What we will build (frontend)

A **Modern UI friendly SPA** consuming this API:

| Phase | Feature | Key routes |
|---|---|---|
| P0 | App shell, theme (dark/light), API client, auth store, guards | all |
| P1 | **Sign Up** + email OTP verification (starting point) | `/register`, `/verify-email` |
| P1 | Login, Logout | `/login` |
| P1 | Forgot / Reset password | `/forgot-password`, `/reset-password/:token` |
| P1 | Profile & change password | `/settings` |
| P2 | Projects list + create + settings | `/projects`, `/projects/new` |
| P2 | Members management | `/projects/:id/members` |
| P3 | Dashboard (stats cards, recent tasks) | `/projects/:id` |
| P3 | Kanban board (todo / in_progress / done) | `/projects/:id/board` |
| P3 | Task modal (attachments, subtasks, assignee) | drawer/modal |
| P4 | Notes (list, pin, CRUD) | `/projects/:id/notes` |
| P5 | Polish: empty states, skeletons, toasts, a11y, responsive | all |

**UI direction (chosen):** Tailwind CSS v4 + shadcn/ui-style components, dark + light
toggle, React Router v7, Zustand stores, native `fetch` wrapper.

## 3. Roles the UI must respect

| Role | Can do in UI |
|---|---|
| `admin` | Everything on their projects: settings, members, roles, delete |
| `project_admin` | Tasks CRUD, subtasks CRUD, notes CRUD, add members |
| `member` | View everything, toggle subtask completion, update own task status |

The API is the source of truth (`validateProjectPermission`), but the UI hides
actions a role can't perform (better UX than surfacing 403s).

## 4. Non-goals for v1

- Realtime collaboration (websockets) — post-v1
- Comments/mentions, notifications
- Mobile apps (responsive web only)

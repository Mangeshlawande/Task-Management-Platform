# 01 — Project Overview & Feature Map

> What Project Camp is, what the backend provides, and what the frontend will deliver.

## 1. What we have (backend — audited & fixed)

Express 5 + MongoDB (Mongoose 9), ESM. REST API under `/api/v1` with a uniform
envelope `{ success, message, data, meta }` and errors `{ success, message, errors }`.
Full OpenAPI docs at `/api-docs` (port comes from the backend `.env` — `8000` in this repo).

**Recent backend fixes (this sprint):**

| Fix | Detail |
|---|---|
| Email verification **removed** (2026-10) | No OTP, no `isEmailVerified`, no SMTP: `POST /auth/register` creates the account and logs the user in immediately. `/auth/verify-otp` and `/auth/resend-otp` answer 404. |
| Auth rate limiting | `express-rate-limit` mounted on register (10/hour per IP) and login (failures only, 10 per 15 min per IP+account). Answers `429 { errors: ['RATE_LIMITED'] }` + `Retry-After`. Set `TRUST_PROXY` when running behind a proxy. |
| Mail subsystem **deleted** | `nodemailer`, `mailgen` and `src/utils/mail.js` are gone; no `SMTP_*` / `MAILTRAP_*` vars exist. There is no forgot-password flow either. |
| Attachments revived | `multer` mounted on `POST /tasks` (`attachments`, max 5 × 1MB, jpeg/png/webp). Was dead code before. |
| Swagger completed | 20 paths fully annotated, shared schemas/responses, refs verified. Previously empty. |
| Error handling hardened | Mongoose ValidationError/CastError/duplicate-key/multer/JSON-parse errors → proper 4xx. |
| Forgot-password **removed** | No reset endpoint, no email link — passwords change only from Settings while logged in. |
| Env template rewritten | `NODE_ENV`, `BCRYPT_SALT_ROUNDS`, JWT expiries with **code fallbacks** (`1d`/`7d`); `FRONTEND_URL`/`SMTP_*` dropped along with the mail stack. |

## 2. What we will build (frontend)

A **Modern UI friendly SPA** consuming this API:

| Phase | Feature | Key routes |
|---|---|---|
| P0 | App shell, theme (dark/light), API client, auth store, guards | all |
| P1 | **Sign Up** (no verification step — instant sign-in) | `/register` |
| P1 | Login, Logout | `/login` |
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

# Project Camp — Backend

REST API for a collaborative project management system (projects, tasks, subtasks, notes, members, dashboards) built with **Express 5 + MongoDB (Mongoose 9)**.

## Features

- **Auth** — register (email OTP verification), login (email *or* username), logout, `GET /me`, refresh-token rotation, change password, forgot/reset password, delete account, resend verification code
  - Accounts stay inactive until the emailed 6-digit code is verified; a verified code logs the user straight in
  - In development (`NODE_ENV !== 'production'`) the code is returned as `data.devOtp` and printed to the console, so the flow works even without a mailbox
  - JWT access + refresh tokens set as **httpOnly cookies** (Bearer header also accepted)
- **Projects** — CRUD + member management (add by email, roles, remove) with role-based permissions
- **Tasks & Subtasks** — CRUD, assignment to project members, status (`todo | in_progress | done`), priority, due dates, up to 5 image attachments per task
- **Notes** — per-project notes with pinning and pagination
- **Dashboard** — task stats by status, member count, recent activity
- **Docs** — full Swagger/OpenAPI at [`/api-docs`](http://localhost:3000/api-docs)

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .ENV.SAMPLE .env
#    → set MONGO_URI, JWT secrets (see comments in the file)

# 3. Run in dev (auto-restart + file watch)
npm run dev

# Server: http://localhost:<PORT from .env> (8000 in this repo) · Docs: /api-docs
```

A bootstrap admin is created on first start from `ADMIN_*` env vars.

## Mail (password-reset emails)

**Zero-config by default:** when no SMTP env vars are set, the app auto-creates an
[Ethereal](https://ethereal.email) test account on first send and logs a **preview URL**
to the console — open it in a browser to see the email. No signup, nothing really delivered.

For production, set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` with any provider
(Gmail app-password, Resend, Brevo, Mailgun, Postmark, company SMTP…).
Legacy `MAILTRAP_*` variables are still honored as a fallback.

## API overview

Base URL: `/api/v1` — uniform envelope `{ success, message, data, meta }`,
errors: `{ success, message, errors: { field: [messages] } }`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET|DELETE /auth/me`, `POST /auth/refresh-token`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password/:resetToken` |
| Projects | `GET|POST /projects`, `GET|PUT|DELETE /projects/:projectId`, `GET|POST /projects/:projectId/members`, `PUT|DELETE /projects/:projectId/members/:userId` |
| Tasks | `GET|POST /projects/:projectId/tasks`, `GET|PUT|DELETE /projects/:projectId/tasks/:taskId`, `POST /projects/:projectId/tasks/:taskId/subtasks`, `PUT|DELETE /projects/:projectId/tasks/:taskId/subtasks/:subTaskId` |
| Notes | `GET|POST /projects/:projectId/notes`, `GET|PUT|DELETE /projects/:projectId/notes/:noteId` |
| Dashboard | `GET /projects/:projectId/dashboard` |
| Health | `GET /healthcheck` |

Full request/response schemas, auth requirements, and error codes: **`/api-docs`** (Swagger UI).

### Roles & permissions

| Action | admin | project_admin | member |
|---|:-:|:-:|:-:|
| Create / update / delete project | ✓¹ | ✓ (update only) | ✗ |
| Manage members & roles | ✓¹ | add members | ✗ |
| Create / update / delete tasks | ✓ | ✓ | ✗ |
| View tasks / notes / dashboard | ✓ | ✓ | ✓ |
| Toggle subtask completion | ✓ | ✓ | ✓ |
| Create / delete subtasks | ✓ | ✓ | ✗ |
| Create / update / delete notes | ✓ | ✓ | ✗ |

¹ *Project-level admin role assigned to the project creator; a separate global `admin` role also exists (bootstrap user).*

## Scripts

```bash
npm run dev          # dev server with watch
npm start            # production start
npm test             # jest
npm run lint         # eslint
npm run format       # prettier write
```

## Project structure

```
src/
├── bootstrap/      # startup tasks (create admin)
├── controllers/    # request handlers, one file per domain
├── db/             # mongo connection
├── docs/           # swagger spec builder
├── middlewares/    # auth (JWT + project roles), validation, multer, errors
├── models/         # mongoose schemas
├── routes/         # route definitions + swagger annotations
├── utils/          # ApiResponse, ApiError, asyncHandler, mail, constants
├── validators/     # express-validator chains
├── app.js          # express app wiring
└── index.js        # entrypoint
```

## Frontend

The matching frontend (React + Vite) is planned/scaffolded in `client/` — see
[`docs/`](docs/) for the frontend architecture, API contract, and build phases.

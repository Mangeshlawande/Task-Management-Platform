# 03 — API Contract (frontend cheat sheet)

> Base: `/api/v1` · Envelope: `{ success, message, data, meta }` · Errors: `{ success, message, errors: { field: [msgs] } }`
> Auth: httpOnly cookies `accessToken` (1d) + `refreshToken` (7d), `credentials: 'include'` everywhere.
> Interactive docs: `/api-docs` (Swagger UI).

## Auth

> Rate limited per IP + account: `429 { errors: ['RATE_LIMITED'] }` with a `Retry-After`
> header and a display-ready `message`. Table of limits: docs/04 § 10.

| Method & path | Body | Success → `data` | Notes |
|---|---|---|---|
| `POST /auth/register` | `{ email, username, password, fullName? }` | `{ user, devOtp? }` (201) | Creates the account unverified and emails a 6-digit OTP (10 min). `devOtp` only when `NODE_ENV !== 'production'`. 409 if email/username taken. `username`: 3–30 chars, `/^[a-zA-Z0-9_]+$/`, sent lowercase. |
| `POST /auth/verify-otp` | `{ email, otp }` | `{ user, accessToken, refreshToken }` (+`devOtp` on resend only) | Consumes the emailed code, marks the email verified **and logs the user in** (sets cookies). 400 `['INVALID_OTP'\|'OTP_EXPIRED']`, 429 `['OTP_MAX_ATTEMPTS']` after 5 wrong guesses. |
| `POST /auth/resend-otp` | `{ email }` | `{}` (+`devOtp` in dev) | New code, 60 s server cooldown. 200 even for unknown emails; 429 `['OTP_COOLDOWN']` inside the cooldown. |
| `POST /auth/login` | `{ email \| username, password }` | `{ user, accessToken, refreshToken }` | Sets httpOnly cookies. 404 unknown user, 401 bad password, **403 `['EMAIL_NOT_VERIFIED']`** when the account hasn't verified its email. |
| `GET /auth/me` | — | `User` | Session hydration on app load. |
| `POST /auth/logout` | — | `{}` | Clears cookies server-side. |
| `POST /auth/refresh-token` | — (cookie) | `{ accessToken, refreshToken }` | Rotation; called automatically by api client. |
| `POST /auth/change-password` | `{ oldPassword, newPassword }` | `{}` | Revokes sessions → redirect to login after. |
| `POST /auth/forgot-password` | `{ email }` | `{}` | Always 200 (enumeration-safe). Email link → `{FRONTEND_URL}/reset-password/{token}`. |
| `POST /auth/reset-password/:resetToken` | `{ newPassword }` | `{}` | Token valid 20 min. |
| `DELETE /auth/me` | — | `{}` | Delete account (cascade). |

**User shape:** `{ _id, username, email, fullName, role, isEmailVerified, avatar: { url, localPath }, createdAt }`
(`isEmailVerified` is absent on accounts predating OTP verification — treat missing as verified.)
`role ∈ admin | project_admin | member` (global default role: `member`)

## Projects

| Method & path | Body / Query | Success → `data` | Notes |
|---|---|---|---|
| `GET /projects` | — | `[{ role, project: { _id, name, description, members, createdAt, updatedAt } }]` | Projects I'm a member of, with my role |
| `POST /projects` | `{ name, description? }` | `Project` (201) | Creator becomes project `admin`. Name unique per creator. |
| `GET /projects/:projectId` | — | `Project` | Any role |
| `PUT /projects/:projectId` | `{ name?, description? }` | `Project` | admin / project_admin |
| `DELETE /projects/:projectId` | — | `{}` | admin (project-level) only; cascades |
| `GET /projects/:projectId/members` | — | `[{ _id, role, user: User, createdAt }]` | |
| `POST /projects/:projectId/members` | `{ email, role: 'project_admin' \| 'member' }` | `{ projectMember }` | Upsert by email; user must exist |
| `PUT /projects/:projectId/members/:userId` | `{ role }` | `ProjectMember` | Project admin only; can't downgrade self |
| `DELETE /projects/:projectId/members/:userId` | — | `{}` | Project admin only; can't remove self; keeps ≥1 admin |

## Tasks & Subtasks

| Method & path | Body / Query | Success → `data` | Notes |
|---|---|---|---|
| `GET /projects/:projectId/tasks` | — | `Task[]` | Populated assignedTo/assignedBy; newest first |
| `POST /projects/:projectId/tasks` | **multipart**: `title, description?, assignedTo?, status?, priority?, dueDate?, attachments[] (≤5 files, 1MB, jpeg/png/webp)` | `Task` (201) | admin / project_admin |
| `GET /projects/:projectId/tasks/:taskId` | — | `Task & { subTasks: SubTask[] }` | |
| `PUT /projects/:projectId/tasks/:taskId` | JSON partial: any of title/description/status/assignedTo/priority/dueDate | `Task` | Creator or project admin. `assignedTo: null` unassigns, `dueDate: null` clears the date. |
| `DELETE /projects/:projectId/tasks/:taskId` | — | `{}` | Cascades subtasks |
| `POST /projects/:projectId/tasks/:taskId/subtasks` | `{ title }` | `SubTask` (201) | admin / project_admin |
| `PUT /projects/:projectId/tasks/:taskId/subtasks/:subTaskId` | `{ title?, isCompleted? }` | `SubTask` | Members may toggle `isCompleted` |
| `DELETE /projects/:projectId/tasks/:taskId/subtasks/:subTaskId` | — | `{}` | |

**Task shape:** `{ _id, title, description, project, assignedTo: User?, assignedBy: User, status: 'todo'|'in_progress'|'done', priority: 'LOW'|'MEDIUM'|'HIGH', dueDate, attachments: [{ url, mimeType, size }], createdAt, updatedAt }`

**Kanban mapping:** columns = `todo` / `in_progress` / `done` → move = `PUT` with `{ status }`.

## Notes

| Method & path | Body / Query | Success → `data` | Notes |
|---|---|---|---|
| `GET /projects/:projectId/notes?page=&limit=` | query | `{ notes: Note[], pagination: { total, page, limit, totalPages } }` | Pinned first; limit ≤ 50 |
| `POST /projects/:projectId/notes` | `{ content }` (≤5000) | `Note` (201) | admin / project_admin |
| `GET /projects/:projectId/notes/:noteId` | — | `Note` | |
| `PUT /projects/:projectId/notes/:noteId` | `{ content?, isPinned? }` | `Note` | Owner or project admin |
| `DELETE /projects/:projectId/notes/:noteId` | — | `{}` | Owner or project admin |

## Dashboard

| Method & path | Success → `data` |
|---|---|
| `GET /projects/:projectId/dashboard` | `{ project, stats: { todo, in_progress, done, total }, memberCount, recentTasks: Task[5] }` |

## Health

`GET /healthcheck` → `{ uptime, timestamp }` — use for a backend-status badge in dev tools page.

## Error semantics quick table

| Status | When | UI behavior |
|---|---|---|
| 400 | Validation / bad file / bad id | Field errors inline |
| 401 | No/expired token | Auto-refresh → retry → else redirect login |
| 403 | Role denied | Hide action; toast if hit |
| 404 | Missing resource / not a member | Empty state |
| 403 | Login: email not verified (`EMAIL_NOT_VERIFIED`) | Route to `/verify-email` with email prefilled |
| 409 | Duplicate email/username/project | Field error |
| 429 | Rate limited (`RATE_LIMITED`), OTP resend cooldown (`OTP_COOLDOWN`), or too many wrong codes (`OTP_MAX_ATTEMPTS`) | Show `message`; countdown + "request a new code"; never auto-retry |
| 500 | Server fault | Generic toast |

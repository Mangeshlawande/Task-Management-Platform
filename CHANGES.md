# Project Camp — Fixes Applied

This document summarizes every change made to the original codebase. Both
the backend (`projectmanagementbackend/`) and frontend (`project-code/`)
now agree on the same API contract and have been built/type-checked
successfully.

## How to run 

### Backend (npm, Node.js, port 8000)
```bash
cd projectmanagementbackend
npm install
npm run dev
```
Update `.env` with your real `MONGO_URI` and SMTP credentials. The provided
`.env` has placeholder/example values for everything else.

### Frontend (npm, Vite/TanStack Start, port 5173)
```bash
cd project-code
npm install
npm run dev
```
`.env` already points `VITE_API_BASE_URL` at `http://localhost:8000/api/v1`.
If `VITE_API_BASE_URL` is ever unset, the app automatically falls back to
mock data (`USE_MOCK_API`), so the UI still works without a backend.

> Note: the frontend was originally a Bun project (`bun.lock`). That file
> has been removed and `packageManager: "npm@10.0.0"` was added so `npm
> install` generates its own `package-lock.json`. No Bun-specific runtime
> APIs were used, so this is a safe switch.

---

## 1. Critical URL/route mismatches (frontend ↔ backend)

**Problem:** the frontend called `/projects/:projectId/tasks`,
`/projects/:projectId/notes`, etc., but the backend exposed tasks at
`/tasks/:projectId` and notes at `/notes/:projectId` — completely different
prefixes. Every task/subtask/note request would have 404'd.

**Fix:** restructured the backend routers so tasks, subtasks, notes, and the
dashboard are now nested under `/api/v1/projects/:projectId/...`, matching
what the frontend already calls:

- `projectmanagementbackend/src/routes/task.routes.js` — rewritten as a
  `mergeParams` router mounted at `/projects/:projectId/tasks`. Routes:
  `GET/POST /`, `GET/PUT/DELETE /:taskId`, plus subtasks at
  `/:taskId/subtasks` and `/:taskId/subtasks/:subTaskId`.
- `projectmanagementbackend/src/routes/note.routes.js` — rewritten as a
  `mergeParams` router mounted at `/projects/:projectId/notes`. Routes:
  `GET/POST /`, `GET/PUT/DELETE /:noteId`.
- `projectmanagementbackend/src/routes/dashboard.routes.js` — rewritten as a
  `mergeParams` router mounted at `/projects/:projectId/dashboard`.
- `projectmanagementbackend/src/routes/project.routes.js` — now mounts the
  three routers above with `router.use('/:projectId/tasks', taskRouter)`
  etc.
- `projectmanagementbackend/src/app.js` — removed the old top-level
  `/api/v1/tasks`, `/api/v1/notes`, `/api/v1/dashboard` mounts (they're now
  nested under `/api/v1/projects`).
- `projectmanagementbackend/src/controllers/task.controllers.js`,
  `subtask.controllers.js`, `note.controllers.js`, `dashboard.controller.js`
  — updated to read `projectId`/`taskId`/`subTaskId`/`noteId` from the new
  nested route params and to scope all queries by `project: projectId`.
- `projectmanagementbackend/src/validators/index.js` — added
  `getTaskValidator`, `getTasksValidator`, `deleteSubTaskValidator`, fixed
  `updateNoteValidator` to validate `noteId` (was checking the wrong param
  name), and added priority/status enum validation.

The frontend services (`tasks.ts`, `notes.ts`) already used the
`/projects/:projectId/...` shape, so **no frontend URL changes were needed**
— they now simply work against the corrected backend.

---

## 2. Auth endpoint mismatches

| Issue | Fix |
|---|---|
| Frontend called `GET /auth/me`; backend only had `POST /auth/current-user` | Added `GET /auth/me` (and kept `POST /auth/current-user` for backwards compatibility) in `auth.routes.js` |
| Frontend called `POST /auth/resend-verification`; backend route was `/auth/resend-email-varification` (typo) | Renamed backend route to `/auth/resend-verification` |
| Frontend called `DELETE /auth/me` for account deletion; no such route existed | Added `DELETE /auth/me` → new `deleteAccount` controller that cascades: removes the user's project memberships, deletes projects they own (plus those projects' tasks/subtasks/notes/members), then deletes the user |
| Email verification link pointed at the **API** (`/api/v1/users/verify-email/:token`), which the frontend's `/verify-email/$token` route would never receive | `registerUser` / `resendEmailVerification` now build the link from `FRONTEND_URL` and point at `${FRONTEND_URL}/verify-email/:token` |
| `FORGOT_PASSWORD_REDIRECT_URL` was empty in `.env`, so reset links had no host | `.env` now sets `FRONTEND_URL=http://localhost:5173`; `forgotPasswordRequest` uses it to build `${FRONTEND_URL}/reset-password/:token` |

`projectmanagementbackend/src/controllers/auth.controllers.js` was rewritten
to add `deleteAccount`, fix both email-link builders, and accept the
request body under either `fullName` or `fullname`.

---

## 3. Authorization logic bugs (wrong role checks)

**Problem:** task/subtask/note update & delete checked
`req.user.role === 'admin'` — the user's **global** system role — instead of
their **project-scoped** role (`req.projectRole`, set by
`validateProjectPermission`). In practice this meant only the single
bootstrapped system admin could ever edit or delete tasks/notes; project
admins were always denied.

Additionally, the `allowAdmin` middleware (also based on the global role)
was applied to task/note creation routes, so **no project admin could create
tasks or notes** either.

**Fix:**
- `task.controllers.js`, `subtask.controllers.js`, `note.controllers.js` —
  all "is this user allowed to modify this item" checks now use
  `req.projectRole === UserRoleEnum.ADMIN || req.projectRole ===
  UserRoleEnum.PROJECT_ADMIN`, falling back to ownership checks (task
  creator / subtask creator / note author) where appropriate.
- `task.routes.js` / `note.routes.js` — replaced `allowAdmin` with
  `validateProjectPermission([UserRoleEnum.ADMIN,
  UserRoleEnum.PROJECT_ADMIN])` on create/update/delete routes, and
  `validateProjectPermission(AvailableUserRole)` (any member) on read
  routes.

---

## 4. Member-role validation

**Problem:** `addMembersToProject` accepted any value from
`AvailableUserRole`, including `admin` — letting a project admin grant
someone a system-admin-equivalent role via project invites.

**Fix:**
- `addMembersToProject` now only accepts `project_admin` or `member`.
- `validators/index.js` → `addMemberToProjectValidator` enforces
  `isIn(['project_admin', 'member'])`.
- `project-code/src/lib/services/members.ts` → `invite()` defensively maps
  any `'admin'` role selection to `'project_admin'` before sending.

`updateMemberRole` (a separate, system-admin-only endpoint) still allows
`admin` since promoting someone to project admin/owner is a legitimate
admin action.

---

## 5. `fullName` vs `fullname` field mismatch

**Problem:** the Mongoose `User` model stores `fullName` (capital N), and
all backend `populate()` calls returned `fullName`. The entire frontend
(types, mock data, components) used `fullname` (lowercase). Real API
responses would have rendered blank names everywhere.

**Fix (frontend-only, no backend schema change needed):**
- New helper `normalizeFullName()` in
  `project-code/src/lib/services/index.ts` recursively walks any
  object/array returned from the API and copies `fullName` → `fullname` if
  `fullname` isn't already present.
- Applied at the service boundary in `auth.ts`, `projects.ts`, `tasks.ts`,
  `notes.ts`, and `members.ts` — every real API response is normalized
  before it reaches React Query / components. Mock data (which already uses
  `fullname`) is untouched.
- `registerUser` controller now also accepts the field as either `fullName`
  or `fullname` in the request body, and the frontend sends both for
  safety.

---

## 6. Token storage (security)

**Problem:** the code comment in `api.ts` claimed the access token was
stored in `sessionStorage` and the refresh token in `localStorage`, but both
were actually written to `localStorage`.

**Fix:** `project-code/src/lib/api.ts` now genuinely stores the access token
in `sessionStorage` (cleared when the tab closes) and the refresh token in
`localStorage`. Added a hard redirect to `/login` if a 401 can't be resolved
by refreshing.

---

## 7. Cascade delete on project removal

**Problem:** `deleteProject` only removed `ProjectMember` rows and the
project itself — tasks, subtasks, and notes were orphaned in the database
forever.

**Fix:** `deleteProject` now runs inside a transaction that deletes, in
order: all `SubTask`s belonging to the project's tasks, all `Task`s, all
`ProjectNote`s, all `ProjectMember`s, then the `Project` itself. The same
cascade (scoped to projects the user owns) runs as part of the new
`deleteAccount` flow.

---

## 8. Port / base-URL mismatch

**Problem:** the frontend defaulted to `http://localhost:8000/api/v1` while
the backend's `.env` had `PORT=3000` — a real backend running with the
provided `.env` would never be reachable at the frontend's default URL.

**Fix:** `projectmanagementbackend/.env` now sets `PORT=8000` to match the
frontend's default `API_BASE_URL`. `CORS_ORIGIN` was also updated to a
comma-separated list (`http://localhost:5173,http://localhost:3000`) and
`app.js` now splits on `,` so both Vite's dev server and any
locally-served build are allowed.

---

## 9. Package manager (Bun → npm)

- Removed `project-code/bun.lock`.
- Added `"packageManager": "npm@10.0.0"` to `project-code/package.json`.
- Ran `npm install` for both projects — `project-code/package-lock.json`
  was generated; `projectmanagementbackend/package-lock.json` already
  existed and was reused.
- No Bun-only runtime APIs were found anywhere in the frontend source, so
  this switch is purely about the package manager / lockfile.

---

## 10. Misc smaller fixes

- `task.controllers.js` / validators now accept and persist `priority`
  (`LOW`/`MEDIUM`/`HIGH`) and `dueDate`, which the frontend `Task` type and
  forms already expected but the backend previously ignored.
- `project-code/src/types/index.ts` — `Task.priority`, `Task.dueDate`,
  `Project.role` (the current user's role in that project, flattened from
  the membership row returned by `GET /projects`), and
  `ProjectMember.projects` (used on the workspace-wide Members page) were
  added.
- `project-code/src/hooks/use-api.ts` — added `useAllTasks()` (aggregates
  tasks across all of the user's projects, used by the dashboard stat
  cards/charts) and a `WorkspaceMember` type so the Members page no longer
  needs non-null assertions.
- `project-code/src/lib/services/projects.ts` — `list()` now flattens the
  backend's `[{ project, role }]` shape into `Project[]` with `.role`
  merged in, matching what `projects.tsx` and `dashboard.tsx` already
  expected.

---

## Verified

- `npm install` succeeds for both `projectmanagementbackend/` and
  `project-code/`.
- Backend: all modified files pass `node --check`; `app.js` loads cleanly
  and registers the full nested route tree (`/api/v1/projects/:projectId/
  tasks`, `/tasks/:taskId/subtasks/...`, `/notes`, `/dashboard`, plus the
  fixed `/api/v1/auth/*` routes); `eslint` is clean on all changed files.
- Frontend: `npx tsc --noEmit` passes with zero errors; `npm run build`
  completes successfully (client + SSR bundles).
- MongoDB Atlas connectivity could not be tested in this sandbox (no
  internet access to `mongodb+srv://...`), so end-to-end request/response
  testing against a live database was not possible. Once you run `npm run
  dev` in `projectmanagementbackend/` with network access, verify:
  - register → check email link points to `http://localhost:5173/verify-email/:token`
  - login → `GET /api/v1/auth/me` returns the user (no more silent logout on refresh)
  - create a project → create a task under it via the UI (was 404 before, should now work)
  - add a project member as `project_admin` → confirm they can edit/delete tasks and notes they don't own
  - delete a project → confirm its tasks/subtasks/notes are gone from MongoDB

# TESTCASES — Project Camp test matrix

> Living test-case README for the production app. Every feature that ships must
> have its rows here, and a feature is "done" only when its rows pass.
> Layers: **E2E** = automated Chrome script, **API** = curl smoke against a
> running backend, **Manual** = QA checklist (UI-only concerns).
>
> Related docs: `projectmanagementbackend/docs/05-implementation-plan.md`
> (acceptance criteria), `projectmanagementbackend/docs/06-agentic-workflow.md`
> § 6 (session log).

## 1. How to run the tests

```bash
# 0) backend must be up (port 8000, MongoDB reachable)
cd projectmanagementbackend && npm run dev

# 1) lint gate (repo root or backend dir)
cd projectmanagementbackend && npm run lint

# 2) E2E — full auth + projects flow in real Chrome (48 assertions,
#    creates an ephemeral user and deletes it afterwards, screenshots
#    land in client/e2e/shots/)
cd projectmanagementbackend/client && npm run test:e2e

# 2b) Feature E2E flows (backend :8000 + vite :5173 running; Chrome)
cd projectmanagementbackend/client
node e2e/board-flow.mjs      # P3 kanban — 32 assertions
echo ""
node e2e/notes-flow.mjs      # P4 notes — 27 assertions (also runs vs mock mode)
node e2e/palette-flow.mjs    # ⌘K palette — 12 assertions
node e2e/banner-flow.mjs     # ConnectionBanner / NF-06 — 10 assertions
node e2e/dashboard-flow.mjs  # status donut / DASH-01+03 — 16 assertions

# 2c) Mock API mode (no backend needed — separate terminal)
cd projectmanagementbackend/client
node src/lib/mock/mock-smoke.mjs   # Node assertions vs in-memory server — 16
npm run dev:mock                   # then, in another terminal:
node e2e/mock-mode.mjs             # browser smoke — 6

# 3) client production build gate
cd projectmanagementbackend/client && npm run build

# 4) API smoke — manual curl checks, see §3 (auth) for the commands
```

**Regression gate before every commit:** `backend lint` → `client lint` →
`client build` → `npm run test:e2e` → the feature E2E flow for whatever
changed. All must be green.

## 2. Test-case status legend

| Mark | Meaning |
|---|---|
| ✅ | Automated & passing today |
| ☐ | Manual QA case (run before release) |
| ⏳ | Feature not built yet — case becomes required on delivery |

## 3. Auth (backend `/api/v1/auth` + `client/src/features/auth/`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| AUTH-01 | Register with invalid email/short password | E2E | Inline field errors, no request fired | ✅ |
| AUTH-02 | Register with valid data | E2E | 201 → redirect `/verify-email` with email prefilled | ✅ |
| AUTH-03 | Register duplicate username/email | API | 409 → mapped to the field, not a toast | ✅ |
| AUTH-04 | Verify email with wrong OTP | E2E | Rejected, attempts counter decrements, recovery path shown | ✅ |
| AUTH-05 | Verify email with correct OTP | E2E | Account activated **and** user logged in → `/projects` | ✅ |
| AUTH-06 | Login before verifying email | API | `403 ['EMAIL_NOT_VERIFIED']` → `/verify-email` | ✅ |
| AUTH-07 | Login with wrong password | E2E | Generic error, no user enumeration | ✅ |
| AUTH-08 | Login (email or username) with good password | E2E | 200 + httpOnly cookies → `/projects` | ✅ |
| AUTH-09 | Session survives hard reload | E2E | `GET /auth/me` refreshes, no bounce to `/login` | ✅ |
| AUTH-10 | 401 → refresh-token rotation → retried request | Manual | One refresh only (no loop), original request replays | ☐ |
| AUTH-11 | Logout | E2E | Cookies cleared, `/login`, guard blocks `/projects` | ✅ |
| AUTH-12 | Forgot password with unknown email | API | Neutral 200 (no enumeration) | ☐ |
| AUTH-13 | Forgot password with known email | E2E | Neutral confirmation + resend cooldown | ✅ |
| AUTH-14 | Reset via emailed link | API | 200, token is **single-use** (reuse → 400) | ☐ |
| AUTH-15 | Reset via expired/garbage token | Manual | Friendly expired state, not a crash | ☐ |
| AUTH-16 | Change password with wrong current | E2E | Inline field error on `currentPassword` | ✅ |
| AUTH-17 | Change password success | E2E | Forced re-login everywhere; old password rejected | ✅ |
| AUTH-18 | Resend OTP within 60 s cooldown | API | Blocked with countdown honoured | ☐ |
| AUTH-19 | OTP brute force (6 wrong codes) | API | Locked after 5 attempts, 429/`RATE_LIMITED` paths intact | ☐ |
| AUTH-20 | `DELETE /auth/me` (delete account) | E2E | User + memberships + owned projects/tasks/subtasks/notes gone | ✅ |
| AUTH-21 | Rate limit: >5 registers/min per IP | API | `429 { errors: ['RATE_LIMITED'] }` + `Retry-After` | ☐ |

## 4. Projects (`client/src/features/projects/`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| PRJ-01 | Project list while logged out | E2E | Bounced to `/login` (guard) | ✅ |
| PRJ-02 | Empty list shows CTA | Manual | Skeleton → empty state → "New project" | ☐ |
| PRJ-03 | Create: name <3 chars / >100 chars | E2E | Inline validation mirrors backend rules | ✅ |
| PRJ-04 | Create success | E2E | Modal closes, card appears with `admin` role badge | ✅ |
| PRJ-05 | Create duplicate name (same creator) | E2E | 409 → inline error on the **name** field | ✅ |
| PRJ-06 | Rename / change description as admin | Manual | Optimistic update, header + settings tab in sync | ☐ |
| PRJ-07 | Member views settings tab | Manual | Read-only; no save/danger controls rendered | ☐ |
| PRJ-08 | Delete project (confirm modal) | Manual | Cascade: tasks/subtasks/notes/members removed in Mongo | ☐ |
| PRJ-09 | Delete project as non-admin | API | 403 from `validateProjectPermission` | ☐ |

## 5. Members (`ProjectMembersTab`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| MEM-01 | List members with avatars + roles | Manual | Populated users render, role badges correct | ☐ |
| MEM-02 | Invite by unknown email | API | 404 "no registered user", inline message | ☐ |
| MEM-03 | Invite existing user as `member` | Manual | Upsert works; re-invite updates role | ☐ |
| MEM-04 | Role select never offers system `admin` | Manual | Only `project_admin` / `member` sent | ☐ |
| MEM-05 | Change member role (project admin) | Manual | Immediate list update without reload | ☐ |
| MEM-06 | Remove member | Manual | Row disappears; removed user loses access (404 on project) | ☐ |
| MEM-07 | Plain member tries invite/role/remove | Manual | Controls hidden; direct API call → 403 | ☐ |
| MEM-08 | Cannot remove/downgrade self; ≥1 admin kept | API | 400 from backend guard | ☐ |

## 6. Tasks / Kanban / Subtasks (P3 — shipped; E2E = `e2e/board-flow.mjs`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| TASK-01 | Board loads 3 columns from `GET /projects/:id/tasks` | E2E | Loading skeleton → grouped by status | ✅ |
| TASK-02 | Create task (title, assignee, priority, due date) | E2E | Appears in `todo` column without reload | ✅ |
| TASK-03 | Create task with ≤5 image attachments (≤1MB, jpeg/png/webp) | Manual | Previews render; 6th file / wrong type rejected client-side | ☐ |
| TASK-04 | Move status (drag or menu) | E2E | Optimistic column move, rolls back on API failure | ✅ |
| TASK-05 | Task detail: edit fields (admin/project_admin) | E2E | Saved; member sees read-only | ✅ |
| TASK-06 | Subtask checklist toggle (any member) | E2E | `PUT …/subtasks/:id` toggles, progress updates | ✅ |
| TASK-07 | Member cannot edit title but can toggle subtasks | Manual | Controls hidden per role | ☐ |
| TASK-08 | Delete task with confirm | E2E | Card removed; attachments gone | ✅ |
| TASK-09 | Filters: search + assignee + priority combined | Manual | Combinable, clearable (board-flow asserts search + priority; assignee combo still manual) | ☐ |
| TASK-10 | Priority/dueDate persisted | API | `LOW/MEDIUM/HIGH` + ISO date round-trip | ☐ |

## 7. Notes (P4 — shipped; E2E = `e2e/notes-flow.mjs`, 27 assertions, runs vs live backend AND mock mode)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| NOTE-01 | Grid + pagination from `meta` | E2E | Page/limit honoured, skeletons on page change | ✅ |
| NOTE-02 | Create/edit as admin | E2E | Appears/updates in place | ✅ |
| NOTE-03 | Pin toggle | E2E | Pinned notes sort first + badge, optimistic | ✅ |
| NOTE-04 | Delete with confirm | E2E | Removed | ✅ |
| NOTE-05 | Member role | E2E | Read-only (own note editable — owner rule); API 403 if forced | ✅ |

## 8. Dashboard (`ProjectDashboardTab`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| DASH-01 | Stats match the board (todo/in_progress/done/total) | E2E | Numbers equal kanban column counts (incl. status donut legend/aria) | ✅ |
| DASH-02 | Member count + recent tasks | Manual | Matches members tab / latest tasks | ☐ |
| DASH-03 | Empty project | E2E | Zeroed stats + base-ring donut, no NaN/blank | ✅ |

## 9. Command palette (⌘K — shipped; E2E = `e2e/palette-flow.mjs`)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| PAL-01 | ⌘K / Ctrl+K opens, Esc closes | E2E | Palette toggles from anywhere; Esc leaves the route untouched | ✅ |
| PAL-02 | Filter → Enter runs first match | E2E | Typing "kanban" → Enter navigates to the board; no-match shows empty state | ✅ |
| PAL-03 | Create intents (task/note/project) | E2E | Navigate → target page opens its create modal (role-gated, 15 s TTL) | ✅ |
| PAL-04 | Theme command | E2E | Toggles the applied dark class (works from `system` too) | ✅ |
| PAL-05 | Mouse selection + focus trap | Manual | Hover moves active, click runs, focus never leaves the dialog | ☐ |

## 10. Non-functional (all features)

| ID | Case | Layer | Expected result | Status |
|---|---|---|---|---|
| NF-01 | `npm run lint` backend + client | Automated | 0 errors | ✅ |
| NF-02 | `npm run build` client | Automated | Passes, gzip budget ≈125 kB | ✅ |
| NF-03 | Dark + light theme on every page | Manual | Tokens from `styles/theme.css`, no unstyled flash | ☐ |
| NF-04 | Keyboard-only walkthrough | Manual | Focus trapped in modals, `role="alert"` errors, labelled fields | ☐ |
| NF-05 | 375 px responsive | Manual | Sidebar collapses, board scrolls horizontally | ☐ |
| NF-06 | Network offline / API down | E2E | Banner + auto-probe/Retry, no white screen (`e2e/banner-flow.mjs`) | ✅ |
| NF-07 | 404 route | Manual | Friendly 404 with link back | ☐ |
| NF-08 | Envelope conformance | Manual | `{ success, message, data, meta }` / errors `{ field: [msgs] }` | ☐ |

## 11. Known gaps (accepted for now)

- **No backend unit/integration tests** — `jest` is configured
  (`jest.config.mjs`, `npm test`) but contains **0 test files** and the
  `jest` binary is not installed (`npm test` → `jest: not found`); API rows
  above are curl-manual until a supertest suite lands.
- **No client unit tests** — coverage comes from the Chrome E2E suites only
  (auth 48, board 32, notes 27, palette 12, banner 10, dashboard 16, mock 6
  assertions — all green as of 2026-10-07).

## 12. Release checklist

1. Regression gate green (§ 1)
2. All ☐ rows in the touched feature area executed
3. `docs/06-agentic-workflow.md` § 6 session-log row appended
4. `TESTCASES.md` statuses updated (☐/⏳ → ✅ where automated)
5. Commit message names the feature; one feature per commit

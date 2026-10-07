# 07 — Remaining Work Inventory

> Accurate as of 2026-10-07 (end of session). Companion to
> `05-implementation-plan.md` (phases) and `TESTCASES.md` (test matrix).

## 1. Shipped ✅

| Area | State | Evidence |
|---|---|---|
| P0 foundation | Complete | Theme, API client (envelope + refresh-retry), stores, guards, UI kit |
| P1 auth | Complete | Register + OTP verify, login, logout, forgot/reset, settings; `e2e/auth-flow.mjs` 48/48 |
| P2 projects | Complete | List, create, layout shell + tabs, settings, members management, role gating |
| P3 tasks/kanban | Complete | Board 3 columns, create/detail modals, subtasks, optimistic moves, filters; `e2e/board-flow.mjs` 32/32 |
| P4 notes | Complete (2026-10-07) | Real grid replaced the placeholder: 12/page pagination, pinned-first (server-mirrored sort), optimistic pin, role gating (create = admin/project_admin, edit/pin/delete = owner-or-admin); `e2e/notes-flow.mjs` 27/27 vs live **and** mock; `features/board/placeholder-data.js` deleted |
| Backend seed script | Complete | `npm run seed` (+ `--wipe`), idempotent, live-verified: 5 users · 2 projects · 8 memberships · 14 tasks · 7 subtasks · 19 notes |
| Frontend mock API mode | Complete | `npm run dev:mock` (`--mode mock`, `VITE_USE_MOCK_API`); Node smoke 16/16, browser `e2e/mock-mode.mjs` 6/6, lint + build green |
| ⌘K command palette | Complete (2026-10-07) | Hand-rolled (no cmdk): navigate/create/theme/logout, filter + ↑↓/Enter/Esc, topbar trigger + global binding in `ProtectedLayout`, one-shot `pendingCreate` intent in uiStore (15 s TTL, role-gated consumers); `e2e/palette-flow.mjs` 12/12 |
| ConnectionBanner | Complete (2026-10-07) | `navigator.onLine` + `pc:api-down/up` events from `api/client.js`; 5 s healthcheck probe + Retry while down; `e2e/banner-flow.mjs` 10/10; TESTCASES NF-06 → ✅ |
| Dashboard status donut | Complete (2026-10-07) | `StatusBreakdownChart.jsx` — hand-rolled SVG (no chart lib), stats from `projectsApi.dashboard`, accessible `role="img"`, empty project → base ring + 0% (no NaN); `e2e/dashboard-flow.mjs` 16/16 |
| Verification pass | Complete (2026-10-07) | backend lint ✅ / client lint ✅ (0 errors) / build ✅ 141 kB gzip / mock smoke 16/16 / E2E: auth 48, board 32, notes 27, palette 12, banner 10, dashboard 16, mock-mode 6 |
| Docs & test matrix | Complete (2026-10-07) | `docs/06` § 6 appended (6 session rows), `docs/05` P4/P5 status notes, this file rewritten; `TESTCASES.md`: TASK-01/02/04/05/06/08 ✅, NOTE-01..05 ✅, DASH-01/03 ✅, NF-06 ✅, new PAL-01..05 section, § 1 run instructions cover all flows |

**Mock mode entry points:** `client/.env.mock`, `client/src/lib/mock/`
(`mock-data.js`, `mock-server.js`, `mock-smoke.mjs`), intercept in
`client/src/api/client.js`, shared `client/src/api/errors.js`.
Deliberately unmocked (real backend only): register, OTP, refresh, forgot/reset.

## 2. Remaining ❌

Everything in the original plan (docs/05 P0–P5 + seed + mock mode + palette +
banner + charts + docs) has shipped. What's left:

### 2.1 Manual QA rows (☐ in TESTCASES — human click-through before release)

| Area | Rows |
|---|---|
| Auth | AUTH-10, AUTH-12, AUTH-14, AUTH-15, AUTH-18, AUTH-19, AUTH-21 |
| Projects | PRJ-02, PRJ-06..09 |
| Members | MEM-01..08 |
| Tasks | TASK-03 (attachments), TASK-07 (member role), TASK-09 (assignee filter combo), TASK-10 (dueDate round-trip) |
| Dashboard | DASH-02 (member count + recent tasks match other tabs) |
| Palette | PAL-05 (mouse selection + focus trap) |
| Non-functional | NF-03 (themes), NF-04 (keyboard-only), NF-05 (375 px), NF-07 (404), NF-08 (envelope) |

### 2.2 Backend tests (known gap — TESTCASES § 11)

`jest` is configured (`jest.config.mjs`, `npm test`) but has **0 test files**
and the binary isn't installed (`jest: not found`). Either:
- install `jest` + `supertest` and land an auth/permissions suite, or
- drop the `test` script + config until then (stop advertising a gate that fails).

API rows stay curl-manual until this lands.

### 2.3 Optional hardening (not required for v1)

- Register the new E2E flows in a single `npm run test:e2e:all` runner (they're
  separate `node e2e/*.mjs` commands today).
- Mock mode: register/OTP/refresh/forgot are deliberately unmocked — add only
  if UI demos need them.
- Bundle: client build is 141 kB gzip (TESTCASES NF-02 budget says ≈125 kB) —
  trim if the budget matters; nothing lazy-loads today.

## 3. Known gaps (accepted for now — carried from TESTCASES § 11)

- No backend unit/integration tests (jest configured, 0 files) — API rows stay curl-manual.
- No client unit tests — coverage from Chrome E2E + mock smoke only.
- Realtime/collaboration, comments, notifications: explicit non-goals for v1 (docs/01 § 4).

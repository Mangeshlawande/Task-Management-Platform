# 06 — Agentic Workflow (building features with AI)

> How to use an AI coding agent (Codebuff/Cursor/etc.) to implement this project feature-by-feature without losing quality. The docs in `docs/` are the agent's context; this file is the operating manual.

## 1. The golden loop

```
PICK one task from docs/05-implementation-plan.md
  ↓
CONTEXT  — point the agent at the 3 relevant docs (contract row, architecture rules, phase task)
  ↓
CONTRACT — agent writes api/<domain>.js functions first (pure JS, no UI)
  ↓
UI       — agent builds the page/components using ui/ primitives + stores
  ↓
WIRE     — guards/routes/store wiring
  ↓
VERIFY   — lint + build + manual acceptance criteria from the plan
  ↓
COMMIT   — small, one feature per commit
```

Never ask for more than one feature per session. Small loops catch drift early.

## 2. Context files to attach per task type

| Task type | Attach |
|---|---|
| New API-facing feature | `03-api-contract.md` (rows), `02-architecture.md` (rules), the feature's `api/*.js` if it exists |
| UI component | `02-architecture.md` § folder rules, an existing similar component |
| Auth change | `04-auth-flow.md` + `api/client.js` + `authStore.js` |
| Bug fix | The error text + the contract row it violates |

## 3. Prompt patterns that work

**Feature (contract-first):**
> "Implement P1.1 RegisterPage per docs/05 plan and the auth rows in docs/03.
> Follow docs/02 conventions: form in features/auth/, API in api/auth.js,
> client validation mirroring backend rules, map `errors` to fields.
> Acceptance criteria are in the plan — verify each."

**Fix:**
> "Register returns 409 with `errors: { username: [...] }` but the form shows a
> toast instead of an inline error. Check features/auth/RegisterPage against
> docs/02 § error contract."

**Refactor:**
> "Extract the repeated role-gating into a `<Can role=…>` component. Same
> behavior, no API changes, update usages in features/."

**Backend change:**
> "Add pagination meta to GET /projects. Update docs/03 first, then the client
> hook. Don't touch unrelated validators."

## 4. Guardrails (put in AGENTS.md, obey always)

- Backend is source of truth — never "fix" a 403 by changing the client to expect 200
- No new dependencies without checking `02-architecture.md` stack table
- `api/` stays React-free; `stores/` stay UI-framework-light
- Never store tokens in JS-readable storage (cookies are httpOnly — keep it that way)
- Don't invent endpoints — anything not in `03-api-contract.md` requires a backend change + doc update first
- Every PR-sized chunk ends with lint + build + the plan's acceptance criteria checked

## 5. Definition of done checklist (agent runs before finishing)

1. Contract match — payloads & error mapping per `03-api-contract.md`
2. States — loading skeleton, empty, error all render
3. Roles — unauthorized actions hidden
4. Theme — verified dark + light
5. `npm run lint` clean, `npm run build` passes
6. Manual happy-path + one failure-path exercised against backend

## 6. Session log (append per feature — institutional memory)

| Date | Feature | Commit | Notes / surprises |
|---|---|---|---|
| 2026-09-28 | Backend audit & fixes | — | Removed email verification, Ethereal mail, multer fix, Swagger completed |
| 2026-09-28 | Backend smoke test | — | 11/11 curl checks green (register/login/cookies/refresh/me/forgot/401). Real `.env` runs on port **8000** — docs synced. Dev stacks in error bodies are expected (NODE_ENV not "development" in .env). |
| 2026-09-28 | P0 foundation | — | client/ scaffolded: theme, api client w/ refresh-retry, stores, guards, UI kit, layouts. Build 110kB gzip. |
| 2026-09-28 | P1.1–1.3 auth pages | — | Register + Login wired; E2E verified through Vite proxy (register 201 → login 200 + cookies → /me 200). Forgot/reset/settings remain in next batch. |
| 2026-09-29 | P2.1 + P2.2 projects list & create | — | `api/projects.js` first (contract-first), then new `ui/` primitives `Modal` (native `<dialog>` — real focus trap/Esc/inert background for free, `data-autofocus` picks the focused field), `EmptyState`, `Skeleton`. `useProjects` owns list state; `ProjectsPage` renders loading skeletons / empty CTA / error+retry / cards (role badge, member count, created date). `CreateProjectModal` mirrors the model rules (name 3–100, description ≤1000) and maps the per-creator 409 to the name field — the backend sends 409 with an **empty** `errors` array, so it can't be auto-mapped. Detail: POST /projects returns a bare Project, so the creator's card gets `role: admin, members: 1` synthesised client-side. Cards intentionally unlinked until P2.3. Chrome E2E grew 12 assertions → **48/48**, and account deletion cascades the test project away (verified in Mongo). |
| 2026-09-29 | Auth rate limiting | — | New runtime dep `express-rate-limit@8.7.0` (approved by product, stack table in docs/02 updated). `src/middlewares/rateLimit.middleware.js` exports 5 limiters mounted **before** the validators so malformed floods are limited too. Keys are `scope:ip:identifier` with `ipKeyGenerator` (IPv6 /56 grouping); login/verify-otp use `skipSuccessfulRequests` so real users never burn budget, while register/resend-otp/forgot-password count every request because each one costs an email. Errors use the project envelope + `errors: ['RATE_LIMITED']` and a `Retry-After` header. `TRUST_PROXY` opt-in added in `app.js` (untrusted XFF would let clients spoof their key and bypass everything). `.ENV.SAMPLE` rewritten to LF, `[TEMPLATE]` junk dropped, PORT corrected to 8000, OTP/TRUST_PROXY documented. Verified live: 429 + marker + Retry-After on each endpoint, and normal flows unaffected (36/36 Chrome E2E still green). |
| 2026-09-29 | Settings email-verified badge | — | Profile card now shows a `Badge` next to the email: success "Email verified" / warning "Email not verified". Derived as `user.isEmailVerified !== false` so pre-OTP accounts (field absent → treated as verified by the backend) aren't mislabelled. Chrome E2E now asserts the badge → 36/36. |
| 2026-09-29 | Email OTP verification (P1.0) | — | Verification returns as an **email OTP** (product decision, replacing the earlier "no verification"): `POST /auth/verify-otp` (consumes the code, activates the account **and logs the user in**) + `POST /auth/resend-otp`. 6-digit CSPRNG code, sha256-hashed, 10-min TTL, 5 attempts, 60 s resend cooldown. Login gate = `403 ['EMAIL_NOT_VERIFIED']` → `/verify-email`. `isEmailVerified` has **no schema default** so pre-OTP accounts stay usable; the bootstrap admin is created verified. Dev (`NODE_ENV !== 'production'`) returns+logs `devOtp`. New `VerifyEmailPage`: 6 code boxes, paste-to-fill, auto-submit, resend countdown, dev panel. Verified: 20/20 curl smoke, 14/14 cooldown & attempt-burn edge cases, **35/35 Chrome E2E** (now self-cleaning). Side fixes: `api/client.js` never read its `retry` flag (a retried 401 could refresh in a loop), root `npm run lint` crashed because it walked into `client/`, `jest.config.mjs` quote violation. |
| 2026-09-28 | P1.6–1.8 auth completion | — | Forgot (neutral + resend), Reset (expired state), Settings (change-pw → forced re-login). E2E: wrong-old-pw 401, change 200, old rejected, reset token single-use, reuse 400. Found+fixed mailer bug (getTestMessageUrl). Both mail paths verified: Ethereal zero-config preview + real SMTP. |
| 2026-10-07 | Seed script + mock API mode | — | `src/seed/seed.js` (`npm run seed`, `--wipe`, idempotent top-up; refuses `NODE_ENV=production`; only deletes `*@projectcamp.dev` data). Live-verified against Atlas: 5 users · 2 projects · 8 memberships · 14 tasks · 7 subtasks · 19 notes; re-run = `0 new project(s)`. Demo admin is `campadmin` (the env admin already owns username `admin`). Frontend mock mode: `VITE_USE_MOCK_API` (`.env.mock`, `npm run dev:mock`) routes every `api/` call through `lib/mock/mock-server.js` (in-memory, ~150 ms latency, mirrors docs/03 permission matrix); `ApiError` extracted to `api/errors.js` to break the circular import. `lib/mock/mock-smoke.mjs` = 16/16 Node assertions; `e2e/mock-mode.mjs` = 6/6 browser. Deliberately unmocked: register/OTP/refresh/forgot. |
| 2026-10-07 | P4 NotesPage | — | Placeholder → real grid: `useNotes` hook (PAGE_SIZE 12, optimistic pin with rollback, server-mirrored `pinnedFirst` sort `{isPinned:-1, createdAt:-1}` — a naive filter-order sort put newly pinned notes in the wrong position), `NoteEditorModal` reuse, delete confirm modal, role gates (`canManageContent` create; owner-or-admin for edit/pin/delete per docs/03), pagination footer from `pagination` meta, loading/empty/error states. Deleted `features/board/placeholder-data.js`. New `e2e/notes-flow.mjs` = **27/27** (NOTE-01..05) — passes against live backend AND mock mode. |
| 2026-10-07 | ⌘K command palette | — | Hand-rolled (no cmdk, per docs/02 stack table): `components/layout/CommandPalette.jsx` on the shared `Modal` (focus trap/Esc free). `uiStore` grew non-persisted `paletteOpen` + one-shot `pendingCreate` intent ({kind, projectId, ts}, 15 s TTL, kind-matched consumer so a mid-navigation page can't swallow it). Global ⌘K/Ctrl+K binding + topbar trigger in `ProtectedLayout`; Projects/Board/Notes consume the intent (role-gated). Bug caught by E2E: theme command compared the **stored** theme (`system`) instead of the applied dark class — "Switch to dark theme" no-op'd on a system-dark page. `e2e/palette-flow.mjs` = **12/12** (note: filter on "kanban", not "board" — "board" substring-matches "dashboard"). |
| 2026-10-07 | ConnectionBanner | — | `components/layout/ConnectionBanner.jsx` mounted in `ProtectedLayout`: `navigator.onLine` + `online/offline` window events + `pc:api-down`/`pc:api-up` CustomEvents dispatched by `api/client.js` (fetch-throw = down, any response = up). While down: 5 s probe loop on `GET /api/v1/healthcheck` + manual Retry; offline state shows no Retry (probing is pointless until `online` fires). `aria-label="Connection status"` — the Toaster also uses `role="status"`, so tests must select on the label. `e2e/banner-flow.mjs` = **10/10** (offline copy, recovery, api-down copy, Retry). Covers NF-06. |
| 2026-10-07 | Dashboard status donut | — | `features/projects/StatusBreakdownChart.jsx` — hand-rolled SVG donut (stroke-darray, no chart lib per docs/02 stack table), fed by `projectsApi.dashboard` stats so segments equal the kanban columns. Legend w/ counts+percentages, `role="img"` aria-label, empty project → base ring only + "No tasks yet" (0%, no NaN — DASH-03). `e2e/dashboard-flow.mjs` = **16/16** incl. throwaway-project create/check/delete. |
| 2026-10-07 | Full verification pass | — | Gates: backend lint ✅ / client lint ✅ (0 errors, 3 pre-existing fast-refresh warnings) / build ✅ 141 kB gzip / mock smoke 16/16. Chrome E2E vs live stack: auth **48/48**, board **32/32**, notes **27/27**, palette **12/12**, banner **10/10**, dashboard **16/16**; mock stack: mock-mode 6/6, notes 27/27, palette 12/12. `npm test` still fails `jest: not found` (known gap, TESTCASES § 11). Fixed a notes-flow race: after clicking Next there's one render where the footer says "Page 2" but the grid still holds page-1 rows — wait for footer **and** card count. |

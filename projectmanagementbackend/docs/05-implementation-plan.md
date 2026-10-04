# 05 — Implementation Plan

> Build order, tasks, and acceptance criteria. One phase = one reviewable PR-sized chunk. Phases P0–P1 are this session's deliverables; later phases follow the same pattern.

## How to work through a phase (senior-dev + AI workflow)

1. Read `docs/03-api-contract.md` rows for the feature → write its `api/<domain>.js` first (contract-first)
2. Build UI bottom-up: `ui/` primitives → forms → page → wire store/hook
3. Verify: `npm run lint`, `npm run build`, then manual check against the phase's acceptance criteria
4. Keep changes vertical: one feature = files inside its slice only
5. If the backend needs a tweak, change backend first, update `03-api-contract.md`, then the UI

## P0 — Foundation  (~half day)

| # | Task | Done when |
|---|---|---|
| 0.1 | Scaffold `client/` (Vite React), Tailwind v4, theme tokens, dark/light toggle | `npm run dev` shows shell in both themes |
| 0.2 | `api/client.js` (envelope unwrap, ApiError with fieldErrors, credentials, 401-refresh-retry) | Simulated 401 triggers one refresh + retry |
| 0.3 | `api/auth.js` + `authStore` + `useAuth` | Store actions callable from console |
| 0.4 | Router: public layout, protected layout, `RequireAuth` / `RedirectIfAuthed` guards, 404 page | Visiting `/projects` logged-out redirects to `/login` |
| 0.5 | UI kit: Button, Input, Field, Card, Badge, Spinner, Toaster, EmptyState, Modal (dialog-based) | Rendered in a gallery route (dev-only) |
| 0.6 | `uiStore` (theme, toasts) persisted | Toggle survives reload |

## P1 — Auth features  (~1 day) ← **starting point**

| # | Task | Done when |
|---|---|---|
| 1.0 | Email OTP verification — backend (`/auth/verify-otp`, `/auth/resend-otp`, `isEmailVerified` gate on login) + `VerifyEmailPage` | Register → code arrives (or `devOtp` in dev) → verifying logs the user in; wrong code counts down attempts; unverified login lands on `/verify-email` |
| 1.1 | **RegisterPage** — username/email/fullName/password, client rules mirror backend | Submit creates account → toast → `/verify-email?email=…` |
| 1.2 | Register error mapping: 400 field errors + 409 duplicate | Fake email shows inline "already exists" |
| 1.3 | **LoginPage** — one identifier field, password, show/hide, redirect back to `from` | Login sets cookies, lands on `/projects` |
| 1.4 | Logout in topbar menu | Click → cookies cleared → `/login` |
| 1.5 | Session bootstrap (`GET /auth/me`) on protected layout mount | Hard reload on `/projects` stays logged in |
| 1.6 | ForgotPasswordPage + sent confirmation state | Always shows neutral confirmation |
| 1.7 | ResetPasswordPage (`/reset-password/:token`), success → login | Valid token resets; expired shows friendly error |
| 1.8 | SettingsPage: profile display (role badge + **email-verified badge**) + change-password (logout after) | Flow works end-to-end |

**Sign-up acceptance criteria (definition of done for the first feature):**
- [ ] All fields validated client-side with same rules as backend
- [ ] Submitting shows pending state; double-submit impossible
- [ ] Backend `errors` object maps to inline field messages
- [ ] 409 surfaces as inline field error, not a toast
- [ ] Success → user lands on `/verify-email` with the email prefilled and a success toast
- [ ] 6-digit OTP entry: paste-friendly, auto-submits when full, resend with a 30 s countdown
- [ ] Wrong / expired code shows a recovery path ("request a new code")
- [ ] Unverified login redirects to `/verify-email` instead of a dead-end error
- [ ] Works with keyboard only; labels bound with `htmlFor`; errors have `role="alert"`
- [ ] Dark and light themes both verified

## P2 — Projects  (~1 day)

| # | Task | Done when |
|---|---|---|
| 2.1 | `GET /projects` list: cards grid with role badge + member count | Empty state → CTA creates first project |
| 2.2 | Create project modal (`name`, `description`) | 409 duplicate shows inline |
| 2.3 | Project layout shell with tab nav (Dashboard / Board / Notes / Members / Settings) | Tabs deep-linkable |
| 2.4 | Settings tab: rename/description (role-gated), danger zone delete (confirm modal) | Member sees read-only |
| 2.5 | Members tab: list, add-by-email (role select), change role, remove — all role-gated | Member role hides admin controls |
| 2.6 | Role labels/avatars helpers in `lib/` | Consistent everywhere |

**Status:** 2.1 + 2.2 shipped 2026-09-29 (see docs/06 § 6). 2.3–2.6 remain — the
cards deliberately render without a link until the project shell (2.3) exists.

## P3 — Tasks / Kanban  (~2 days)

| # | Task | Done when |
|---|---|---|
| 3.1 | Board page: 3 columns from `GET /tasks` grouped by status | Cards render with priority badge + assignee avatar |
| 3.2 | Optimistic status move → `PUT /tasks/:id { status }` | Drag or "move" menu updates column instantly, rolls back on failure |
| 3.3 | Task create modal (multipart `attachments` ≤5 files w/ previews, assignee = project members) | Task appears in board without reload |
| 3.4 | Task detail modal: edit fields, subtask checklist (toggle = `PUT subtasks`), attachments gallery | Member can toggle subtasks but not edit title |
| 3.5 | Delete task with confirm | Card removed |
| 3.6 | Filters: search by title, filter by assignee/priority | Combinable |

## P4 — Notes  (~0.5 day)

| # | Task | Done when |
|---|---|---|
| 4.1 | Notes grid w/ pagination (page/limit from `meta`) | Pinned notes show badge & sort first |
| 4.2 | Create/edit modal (admin/project_admin only), delete confirm | Member sees read-only |
| 4.3 | Pin toggle | Optimistic update |

## P5 — Dashboard & Polish  (~1 day)

| # | Task | Done when |
|---|---|---|
| 5.1 | Dashboard: stat cards (todo/in_progress/done/total), member count, recent tasks list | Numbers match kanban |
| 5.2 | Skeletons for all loading states | No layout shift |
| 5.3 | Empty states for every list | Include next-action CTA |
| 5.4 | Responsive: sidebar → bottom nav on mobile; board horizontal-scroll | 375px wide verified |
| 5.5 | a11y pass: focus traps in modals, `aria-*` on interactive, contrast | Keyboard-only walkthrough |
| 5.6 | Error boundary + 404 + offline toast | No white screens |

## Definition of Done (every feature)

- [ ] Matches `03-api-contract.md` (endpoints, payloads, error mapping)
- [ ] Loading / empty / error states implemented
- [ ] Role-gated controls hidden for unauthorized roles
- [ ] Works in dark + light theme
- [ ] `npm run lint` + `npm run build` clean
- [ ] Manually exercised against the running backend

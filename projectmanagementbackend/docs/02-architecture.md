# 02 — Architecture

> How the frontend is structured and why. Follow these conventions when adding any feature.

## 1. Tech stack (locked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 19 + Vite (JavaScript) | Pure SPA; backend is a separate REST API |
| Styling | Tailwind CSS v4 | `@theme` tokens in `styles/theme.css` |
| UI kit | shadcn/ui-style components (hand-rolled in `ui/`) | No heavy dependency; copy-paste philosophy |
| Router | React Router v7 (`BrowserRouter` + data routers) | Loaders not required; guards via components |
| State | Zustand | 2 stores: `authStore`, `uiStore` |
| Server data | `fetch` wrapper + small hooks (`useXxx` per feature) | Thin; each hook owns its loading/error state |
| Forms | Controlled components + tiny `useForm` helper | Matches backend field errors 1:1 |
| Toasts | `ui/toaster.jsx` (Zustand-driven) | For success/error feedback |
| Icons | `lucide-react` | Only runtime UI dependency besides React |

**Backend runtime dependency the UI depends on** (full list: root `package.json`)

| Package | Why the client cares |
|---|---|
| `express-rate-limit` | Auth endpoints answer `429 { errors: ['RATE_LIMITED'] }` + `Retry-After` — the UI surfaces `message` and must not auto-retry (docs/04 § 10) |

## 2. Folder structure (client/)

```
client/
├── index.html
├── package.json            # self-contained; can be moved out to a sibling repo later
├── vite.config.js          # dev proxy /api → http://localhost:3000 (keeps cookies first-party)
├── .env.example            # VITE_API_URL (only needed if not using the proxy)
└── src/
    ├── main.jsx            # router + providers
    ├── app/                # application wiring
    │   ├── router.jsx      # route tree (public layout vs protected layout)
    │   └── App.jsx         # <Outlet/> root, toaster, theme init
    ├── api/
    │   ├── client.js       # fetch wrapper: credentials:'include', envelope unwrap, ApiError
    │   ├── auth.js         # register/login/logout/me/refresh/forgot/reset/change-password
    │   ├── projects.js     # projects + members + dashboard
    │   ├── tasks.js        # tasks + subtasks + FormData attachments
    │   └── notes.js        # notes
    ├── stores/
    │   ├── authStore.js    # user, status, login/logout/fetchMe/bootstrap actions
    │   └── uiStore.js      # theme ('light'|'dark'|'system'), sidebar, toasts
    ├── hooks/
    │   ├── useAuth.js      # convenience selector over authStore
    │   ├── useTheme.js
    │   └── useFetch.js     # generic { data, error, loading, refetch } helper
    ├── components/
    │   ├── layout/         # PublicLayout, ProtectedLayout (sidebar+topbar), guards
    │   ├── forms/          # Field, Input, Button (submit state), FormError
    │   └── ui/             # Card, Modal, Badge, Skeleton, EmptyState, Toaster…
    ├── features/
    │   ├── auth/           # RegisterPage, VerifyEmailPage, LoginPage, ForgotPasswordPage, ResetPasswordPage
    │   ├── projects/       # ProjectsPage, CreateProjectModal, ProjectSettings…
    │   ├── board/          # BoardPage (kanban), TaskModal, SubtaskList, Attachments
    │   ├── notes/          # NotesPage
    │   └── dashboard/      # DashboardPage (stats cards, recent tasks)
    ├── lib/                # helpers (dates, initials, role labels, status maps)
    └── styles/theme.css    # tailwind v4 @theme tokens, dark variant
```

**Rules**

1. **Features are vertical slices.** A feature owns its pages, its hooks and its API module. Cross-feature imports only via `components/ui`, `lib`, `stores`, `api`.
2. **`api/` never imports React.** Plain async functions returning unwrapped `data`.
3. **Stores hold client state only** (session user, theme). Server data lives in component/hook state — no duplication.
4. **Route guards render, they don't redirect inside effects.** `<RequireAuth>` decides between `<Navigate>` and `<Outlet/>` synchronously from store state.

## 3. Data flow

```
Component → feature hook (useXxx) → api/auth.js|projects.js → api/client.js
                                                                    │
        ┌───────────────────────────────────────────────────────────┘
        ▼
  fetch(BASE + path, { credentials: 'include', … })
        │
        ├─ 2xx  → unwrap { data } envelope → hook setState → UI
        ├─ 401  → client tries POST /auth/refresh-token once → retry original
        │         └─ refresh failed → authStore.clear() → redirect /login
        └─ 4xx  → throw ApiError { status, message, fieldErrors } → form maps fieldErrors
```

### Why cookies (not Bearer-in-localStorage)

- Backend already sets `accessToken`/`refreshToken` as **httpOnly** cookies (1d / 7d)
- XSS-safe: no readable tokens in JS
- `SameSite=strict` works because Vite dev proxy makes the API same-origin
- The refresh endpoint rotates cookies; the client just needs one retry

## 4. Vite proxy (dev)

```js
// vite.config.js — the reason cookie auth "just works" locally
// Target = backend PORT from its .env (8000 in this repo); override with API_PROXY_TARGET.
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/images': { target: 'http://localhost:8000', changeOrigin: true }, // task attachments
  },
}
```

Cookies are set for `localhost:5173` as a first-party context → `SameSite=strict` passes.

## 5. Error contract (backend → UI)

| Backend | Client interpretation |
|---|---|
| `400 { errors: { field: [msgs] } }` | Map to form field errors |
| `401` invalid/expired access token | Silent refresh + retry once, then redirect |
| `403` role denied (or login: email not verified) | Hide the action in UI; login → `/verify-email` |
| `404` not found / no membership | Empty state or "not found" page |
| `409` duplicate | Field error (e.g. "email already exists") |
| `429` rate limited / OTP cooldown | Show `message`; wait and retry — never auto-retry |
| `500` | Generic toast, log to console |

## 6. Backend contracts the UI relies on

- `POST /auth/register` → 201 `{ user, devOtp? }` — account is **unverified** until `/auth/verify-otp` (docs/04 § 1)
- `POST /auth/login` → `403 ['EMAIL_NOT_VERIFIED']` while the email is unverified
- `GET /auth/me` → hydrates session on app load
- `POST /auth/login` → sets httpOnly cookies + returns user
- `POST /auth/refresh-token` → cookie-based rotation
- Reset links point to `{FRONTEND_URL}/reset-password/{token}` → SPA route
- Envelope always `{ success, message, data }` — client unwraps `data`

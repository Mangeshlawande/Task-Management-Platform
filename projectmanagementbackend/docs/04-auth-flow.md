# 04 — Auth Flow

> The complete authentication playbook between SPA and backend. Sign Up is the first feature we build; every other flow reuses this machinery.

## 1. Sign Up (no verification step)

There is **no e-mail verification and no e-mail anywhere in this app** — no
OTP, no SMTP config, no forgot-password link. Sign-up creates the account and
logs the user in the same request (product decision, 2026-10: the OTP flow
and the whole mail subsystem were removed).

```
┌────────────┐   POST /auth/register        ┌────────────┐
│ RegisterPage│ ──────────────────────────▶ │   Backend  │
│ (form)     │   { email, username,         │  validates │
│            │     password, fullName }     │  dedupes   │
│            │                              │  creates   │
│            │                              │  mints JWTs│
│            │ ◀──────────────────────────  │            │
│            │   201 { user, accessToken,   │            │
│            │         refreshToken }       │            │
│            │   + httpOnly cookies set     │            │
└─────┬──────┘                              └────────────┘
      │ authStore.setUser(data.user)
      │ navigate('/projects', { replace: true })
      ▼
   /projects  — account is live, no gate
```

**Client behavior:**
- Client validation mirrors backend rules: email format, username regex
  `^[a-zA-Z0-9_]+$` (3–30, lowercase), password ≥ 8, fullName optional ≤ 100
- Submit → disable button, show spinner
- `409` → field error under email/username ("already exists")
- `400` → map `errors` object to fields
- Success → seed `authStore` from `data.user`, toast, `navigate('/projects')`

**Server behavior:** `registerUser` creates the `User`, then calls the same
`generateAccessAndRefreshToken` helper login uses and sets both cookies before
answering `201`. The response shape is therefore identical to login's
(`{ user, accessToken, refreshToken }`) minus the message.

**User shape has no verification field.** `isEmailVerified`, the hashed OTP
fields and the forgot-password token fields were removed from
`src/models/user.models.js`; older documents that still carry them are simply
ignored by Mongoose (strict schema) and no code reads them.

## 2. Login

```
LoginPage ── POST /auth/login ──▶ backend
                 │  validates user+password
                 │  Set-Cookie: accessToken (httpOnly)
                 │  Set-Cookie: refreshToken (httpOnly)
                 ◀── 200 { user, accessToken, refreshToken }
authStore.setUser(user) → navigate to redirect target or /projects
```

- Backend accepts **email or username** in the same field strategy: UI gives one
  "Email or username" input.
- `401`/`404` → generic "Invalid credentials" message (don't reveal which part failed).
- Login never returns `403` — there is no verification gate to trip.

## 3. Session hydration (every app load)

```
<RequireAuth> mount
   └─ authStore.bootstrap()
        └─ GET /auth/me  (credentials: 'include')
             ├─ 200 → user in store → render app
             ├─ 401 → client auto-refreshes (below) → retry → maybe login
             └─ offline → show app skeleton, retry
```

## 4. The 401 → refresh → retry cycle (in `api/client.js`)

```
request ──▶ 401 response
   │
   ├─ already retrying? ──▶ authStore.clear() → redirect /login (session expired)
   │
   ├─ POST /auth/refresh-token  (cookie does the work)
   │     ├─ 200 → new cookies set → RETRY original request (once)
   │     └─ 401 → authStore.clear() → redirect /login
```

**Rules**
- Only one refresh attempt per request — never loop
- Refresh is also serialized (single in-flight promise) to avoid thundering herd
- `GET /auth/me` itself participates: a fresh page load with expired access token
  silently recovers via refresh

## 5. Logout

```
User clicks logout → POST /auth/logout (server clears cookies + revokes refresh token)
                  → authStore.clear()
                  → navigate('/login')
```

## 6. Password recovery — deliberately absent

There is **no forgot-password flow** (no endpoint, no route, no e-mail to send
a link from). Passwords change in exactly one place:

```
SettingsPage (logged in) ── POST /auth/change-password ──▶ § 7
```

A user who forgot their password has to ask an admin to reset it out of band
(or the bootstrap admin can be used). `/forgot-password` and
`/reset-password/:token` are gone from the router, so those URLs render the
SPA's 404 page; the API answers `404` JSON for the old `/auth/*` paths.

## 7. Change password (settings page)

```
POST /auth/change-password { oldPassword, newPassword }
  └─ 200 → server revoked sessions + cleared cookies
       → authStore.clear() → navigate('/login', { state: { reason: 'password-changed' } })
```

## 8. Route guard matrix

| Route | Guard | Behavior when not met |
|---|---|---|
| `/register`, `/login` | `<RedirectIfAuthed>` | Already logged in → `/projects` |
| `/projects/**` (all app pages) | `<RequireAuth>` | Not logged in → `/login` (preserve `from` for post-login redirect) |

## 9. Store shape (`authStore`)

```js
{
  user: null | { _id, username, email, fullName, role, avatar },
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated',
  // actions: bootstrap(), login(credentials), register(payload),
  //          logout(), clear()
}
```

Guards never call the API themselves — they read `status`. Only `bootstrap()`
talks to `/auth/me`.

## 10. Rate limits (what the UI must expect)

Auth endpoints are protected by `express-rate-limit`
(`src/middlewares/rateLimit.middleware.js`). A blocked request returns the usual
error envelope — `429`, `errors: ['RATE_LIMITED']`, a display-ready `message`
and a `Retry-After` header — so every auth form already renders it through
`err.message`. **Never auto-retry a 429.**

| Endpoint | Key | Limit | Counts |
|---|---|---|---|
| `POST /auth/login` | IP + email/username | 10 / 15 min | failures only |
| `POST /auth/register` | IP | 10 / hour | every request |

Successful logins are skipped (`skipSuccessfulRequests`), so normal use never
consumes the budget — only guessing does.

**Deployment notes**

- `req.ip` is only meaningful when Express knows about your proxy: set
  `TRUST_PROXY=<hops>` (e.g. `1` behind a single nginx). Leaving it unset is the
  safe default — trusting `X-Forwarded-For` blindly would let a client spoof its
  own key and bypass every limit.
- The default `MemoryStore` is per process: counters reset on restart and are not
  shared across instances. Multiple instances need a shared store
  (e.g. `rate-limit-redis`) or sticky sessions.

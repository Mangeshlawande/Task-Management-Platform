# 04 — Auth Flow

> The complete authentication playbook between SPA and backend. Sign Up is the first feature we build; every other flow reuses this machinery.

## 1. Sign Up + email verification (the starting point)

Verification is an **email OTP** — a 6-digit code, not a magic link. Rationale:
a code survives mail clients that rewrite or prefetch links, needs no second
browser tab, and the same `sendEmail`/Mailgen machinery already powers password
reset. The code is stored **hashed (sha256)** and is valid for 10 minutes.

```
┌────────────┐   POST /auth/register        ┌────────────┐
│ RegisterPage│ ──────────────────────────▶ │   Backend  │
│ (form)     │   { email, username,         │  validates │
│            │     password, fullName }     │  dedupes   │
│            │                              │  creates   │
│            │                              │  isEmailVerified = false
│            │                              │  sends OTP │
│            │ ◀──────────────────────────  │  (by email)│
│            │   201 { user, devOtp? }      └────────────┘
└─────┬──────┘
      │ navigate('/verify-email', { state: { email, devOtp } })
      ▼
┌────────────────┐  POST /auth/verify-otp { email, otp }
│ VerifyEmailPage│ ─────────────────────────────▶ backend
│ 6 code boxes   │ ◀── 200 { user, accessToken, refreshToken }
│ re-send (30s)  │     + httpOnly cookies set → user IS logged in
└────────────────┘  → authStore.setUser(user) → /projects
```

**Client behavior:**
- Client validation mirrors backend rules: email format, username regex
  `^[a-zA-Z0-9_]+$` (3–30, lowercase), password ≥ 8, fullName optional ≤ 100
- Submit → disable button, show spinner
- `409` → field error under email/username ("already exists")
- `400` → map `errors` object to fields
- Success → toast + `navigate('/verify-email', { state: { email, devOtp } })`

**Verification rules (server):**

| Rule | Value |
|---|---|
| Code shape | 6 digits, `crypto.randomInt` (CSPRNG) |
| Stored as | `sha256(code)` — plaintext is never persisted |
| Lifetime | 10 minutes (`emailVerificationOtpExpiry`) |
| Wrong-code limit | 5 attempts, then the code is dead and a new one must be requested |
| Resend | 60 s cooldown (server) + 30 s UI countdown |

**Unverified accounts cannot log in.** `POST /auth/login` answers
`403 { errors: ['EMAIL_NOT_VERIFIED'] }`; `LoginPage` catches that marker and
routes the user to `/verify-email` (email pre-filled when the identifier was
an email). Verifying successfully returns tokens *and* sets cookies, so the
user lands in the app instead of retyping their password.

> **Backwards compatibility:** `isEmailVerified` has **no schema default** on
> purpose. Accounts created before this feature have no stored value and are
> therefore treated as verified — nobody gets locked out. The bootstrap admin
> (`createAdmin.js`) is created with `isEmailVerified: true` for the same reason.

> **Local development:** when `NODE_ENV !== 'production'` the code is both
> logged to the backend console and returned as `data.devOtp`, and
> `VerifyEmailPage` renders it in a "development mode" panel. This keeps the
> flow testable when SMTP delivery is slow or unavailable. Set
> `NODE_ENV=production` to remove it completely.

**Enumeration note:** `POST /auth/resend-otp` returns 200 for unknown emails,
but `429` while a known-unverified account is inside its cooldown window —
account existence is already visible via the login `403` marker, so this is
an accepted trade-off.


## 2. Login

```
LoginPage ── POST /auth/login ──▶ backend
                 │  validates user+password
                 │  user.isEmailVerified === false?
                 │     └── 403 ['EMAIL_NOT_VERIFIED'] → /verify-email
                 │  Set-Cookie: accessToken (httpOnly, 1d)
                 │  Set-Cookie: refreshToken (httpOnly, 7d)
                 ◀── 200 { user, accessToken, refreshToken }
authStore.setUser(user) → navigate to redirect target or /projects
```

- Backend accepts **email or username** in the same field strategy: UI gives one
  "Email or username" input.
- `401`/`404` → generic "Invalid credentials" message (don't reveal which part failed).
- `403` → email not verified yet (see § 1) — the only 403 login can return.

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

## 6. Forgot / Reset password

```
ForgotPasswordPage ── POST /auth/forgot-password { email } ──▶ always 200
                   ◀── "If that email exists, we sent a link"  (never confirm existence)

User opens email link:  {FRONTEND_URL}/reset-password/{unHashedToken}
   └─ ResetPasswordPage reads :token from route
        └─ POST /auth/reset-password/:token { newPassword }
             ├─ 200 → toast "Password updated" → navigate /login
             └─ 400 → "Link is invalid or expired" (+ "request a new one" link)
```

## 7. Change password (settings page)

```
POST /auth/change-password { oldPassword, newPassword }
  └─ 200 → server revoked sessions + cleared cookies
       → authStore.clear() → navigate('/login', { state: { reason: 'password-changed' } })
```

## 8. Route guard matrix

| Route | Guard | Behavior when not met |
|---|---|---|
| `/register`, `/login`, `/forgot-password`, `/reset-password/:token`, `/verify-email` | `<RedirectIfAuthed>` | Already logged in → `/projects` |
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
| `POST /auth/verify-otp` | IP + email | 10 / 15 min | failures only |
| `POST /auth/resend-otp` | IP + email | 5 / 15 min | every request |
| `POST /auth/forgot-password` | IP + email | 5 / 15 min | every request |
| `POST /auth/register` | IP | 10 / hour | every request |

Successful logins and correct codes are skipped (`skipSuccessfulRequests`), so
normal use never consumes the budget — only guessing does. These limits are
separate from the per-account OTP rules in § 1 (5 wrong codes burn the code, 60 s
resend cooldown) and from the enumeration-safe 200s on `/auth/resend-otp` and
`/auth/forgot-password`.

**Deployment notes**

- `req.ip` is only meaningful when Express knows about your proxy: set
  `TRUST_PROXY=<hops>` (e.g. `1` behind a single nginx). Leaving it unset is the
  safe default — trusting `X-Forwarded-For` blindly would let a client spoof its
  own key and bypass every limit.
- The default `MemoryStore` is per process: counters reset on restart and are not
  shared across instances. Multiple instances need a shared store
  (e.g. `rate-limit-redis`) or sticky sessions.

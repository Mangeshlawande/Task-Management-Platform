# 08 — Deploying to Render (single-origin guide)

> The client lives at `projectmanagementbackend/client/` **inside** the backend
> project. That's an advantage on Render: one web service, one domain, one
> origin — so the httpOnly auth cookies (`sameSite: 'strict'`) and the client's
> relative `/api/v1/...` fetches work with zero CORS/cookie changes.
>
> Companion files: `render.yaml` (repo root, Blueprint), `docs/07` (status).

## 0. How it works

```
Render build command:
  npm ci                                  # backend deps
  cd client && npm ci --include=dev && npm run build   # Vite → client/dist
                                   # (--include=dev: NODE_ENV=production
                                   #  would skip devDeps → no vite)

Render start command:
  npm start                               # node src/index.js (Express, :PORT)

Browser  ──GET /, /login, /assets/*──▶  Express serves client/dist (SPA)
Browser  ──GET/POST /api/v1/*──────▶  Express API (same origin, same cookies)
```

`src/app.js` detects `client/dist/index.html` at boot:
- **present** (Render, or local `npm run build` in `client/`) → Express serves
  the bundle + SPA-fallback for deep links (`/login`, `/projects/:id/board`);
  the API-root JSON banner at `/` is disabled.
- **absent** (normal local dev) → nothing changes; Vite on :5173 serves the UI
  and proxies `/api` + `/images` to :8000 as before.

## 1. Prerequisites

1. **Repo pushed to GitHub/GitLab** (Render connects to it; `render.yaml` must
   be at the repo root — it already is).
2. **MongoDB Atlas** (M0 free is fine):
   - Create DB user + copy the connection string (`mongodb+srv://...`).
   - Network Access → **Add IP Address → 0.0.0.0/0** (Render egress IPs are
     dynamic; Atlas blocks new IPs otherwise — the #1 first-deploy failure).
3. **SMTP credentials** (Gmail app-password, Resend, Brevo, …). Required, not
   optional: `NODE_ENV=production` strips the `devOtp` fallback from API
   responses, so signups can only be verified via a real OTP email.

## 2. Deploy (Blueprint — recommended)

1. Render Dashboard → **New + → Blueprint** → connect your repo.
2. Render reads `render.yaml` at the root. It pre-fills:
   - `rootDir: projectmanagementbackend` (the client-inside-backend layout)    - build: `npm ci && cd client && npm ci --include=dev && npm run build`
      (`--include=dev` because `NODE_ENV=production` applies at build time and
      would otherwise skip vite)
   - start: `npm start`, health check: `/api/v1/healthcheck`
   - `NODE_ENV=production`, `NODE_VERSION=24.18.0`, `TRUST_PROXY=1`
   - `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` auto-generated (secret)
3. Click **Apply**. The first deploy will start but the app stays down until
   you fill the `sync: false` vars (next step).

**Manual alternative:** New + → **Web Service** → same repo → Runtime Node →
copy the Build/Start commands and env vars from `render.yaml` by hand.

## 3. Environment variables (dashboard → Environment tab)

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas `mongodb+srv://…` string |
| `FRONTEND_URL` | `https://<your-service>.onrender.com` — used to build verification/reset email links |
| `CORS_ORIGIN` | same URL (defensive; same-origin requests don't need CORS) |
| `SMTP_HOST/PORT/USER/PASS` | your SMTP provider (e.g. `smtp.resend.com`, `587`) |
| `MAIL_FROM` | e.g. `Project Camp <noreply@yourdomain.com>` |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | already auto-generated — don't re-paste from `.env` |

Notes:
- Don't set `PORT` — Render assigns it and Express reads `process.env.PORT`.
- `.env` is gitignored and not used on Render; the dashboard (or `render.yaml`)
  is the source of truth.
- Optional: `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` to control the
  bootstrap admin (defaults `admin@example.com` / `admin123` — **change them**).

After saving vars → **Manual Deploy → Clear build cache & deploy**.

## 4. Verify (2 minutes)

Open `https://<service>.onrender.com` and check:

- `/api/v1/healthcheck` → `{"success":true,...}`
- `/` renders the React app (not the API JSON banner — the banner only shows
  when `client/dist` is absent)
- Refresh on `/login` works (SPA fallback, no 404)
- Register → OTP email arrives; production mode has **no** `devOtp` in the
  response, so if no email arrives, SMTP vars are wrong
- Login → create project → create task → all same-origin, no CORS errors in
  the browser console
- `/api-docs` → Swagger UI

## 5. Post-deploy tasks

```bash
# Seed demo data (idempotent, safe to re-run) — Render shell or locally
# against the prod DB:
#   Dashboard → <service> → Shell → npm run seed
npm run seed           
```

- **File uploads** (`public/images`): the Render filesystem is **ephemeral** —
  task attachments are lost on every redeploy/free-plan restart. For v1 this
  is acceptable (test-only data); production needs S3/Cloudinary (a disk on
  Render only survives restarts, not redeploys, for build-dir paths — mount a
  persistent disk and point multer's `uploadPath` at it if you stay on Render).
- **Free plan**: the service sleeps after ~15 min idle (first request takes
  ~30 s — the client's ConnectionBanner will show "can't reach the server"
  briefly). Upgrade to a paid plan to remove this.
- **Custom domain**: service → Domains → add; then update `FRONTEND_URL` and
  `CORS_ORIGIN` and redeploy (email links + CORS follow them).

## 6. Local simulation of production (recommended before deploying)

```bash
cd projectmanagementbackend/client && npm run build
cd .. && NODE_ENV=production PORT=8000 npm start
# open http://localhost:8000 → should serve the SPA, /api/v1/healthcheck OK
# deep link http://localhost:8000/login → index.html, not 404
```

To go back to dev mode: `rm -rf client/dist` (or just run Vite as usual —
only `/` behaviour differs while dist exists).

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Deploy fails at `npm run build` | read build log; usually a client lint/type error — reproduce locally with `cd client && npm run build` |
| `sh: 1: vite: not found` | build command missing `--include=dev` — `NODE_ENV=production` makes `npm ci` skip devDependencies (vite is one) |
| App crashes on boot: `MongoServerSelectionError` | `MONGO_URI` unset/wrong, or Atlas Network Access missing `0.0.0.0/0` |
| `/` shows API JSON, not the UI | `client/dist/index.html` missing → build command didn't run or `rootDir` wrong |
| Deep link 404s on refresh | stale deploy — clear cache & redeploy so the new `app.js` SPA fallback ships |
| Login works but session lost on refresh | `NODE_ENV` not `production` (cookie `secure` flag) — check dashboard var |
| OTP email never arrives | SMTP vars; also check provider spam folder; `MAIL_FROM` domain must be authorized by the provider |
| Rate-limiter blocks everyone behind Render's proxy | `TRUST_PROXY=1` must be set (it is, in `render.yaml`) |
| Attachments 404 after redeploy | expected — ephemeral disk, see § 5 |

## 8. Why not a static site + separate API on Render?

Render static sites can't proxy `/api`, and the client hard-codes **relative**
`/api/v1/...` URLs with `sameSite: 'strict'` cookies — split origins would
require (a) an API base-URL env var wired through `api/client.js`, (b)
`sameSite: 'none'; secure: true`, (c) credentialed CORS on every route. Three
cross-cutting changes for zero benefit. Revisit only if you move the frontend
to a CDN with an edge proxy (e.g. Cloudflare) — then do (a)+(b)+(c) first.

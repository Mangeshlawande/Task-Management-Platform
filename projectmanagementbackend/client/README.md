# Project Camp — Frontend (client/)

Modern SPA for the Project Camp backend (React 19 + Vite + Tailwind v4 + Zustand).
Specs live in the backend repo's [`docs/`](../docs/) folder — start with `01-overview.md`.

## Quick start

```bash
# 1. from the client/ folder
npm install

# 2. make sure the backend is running (default expected on :8000)
#    ../ npm run dev

# 3. start the dev server
npm run dev
# → http://localhost:5173  (Vite proxies /api and /images to the backend)
```

If your backend runs on another port: `cp .env.example .env` and set
`API_PROXY_TARGET`, or export it before `npm run dev`.

## What works today

- **Sign up** (`/register`) — full validation, inline field errors from the API
- **Log in / out** — httpOnly-cookie session, auto refresh on expiry
- **Forgot password** (`/forgot-password`) — neutral confirmation + resend cooldown
- **Reset password** (`/reset-password/:token`) — from the email link, expired-link state
- **Settings** (`/settings`) — profile + change password (signs you out everywhere, by design)
- **Protected shell** — guards, theme toggle (dark/light/system), toasts

## Conventions

See `AGENTS.md` in the repo root and `docs/02-architecture.md` — features are
vertical slices, `api/` is React-free, guards never fetch.

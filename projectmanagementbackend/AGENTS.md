# AGENTS.md — Working conventions

> Rules for any AI agent (or human) contributing to this repo. Read `docs/01-overview.md` first.

## Project shape

- **Backend (this repo):** Express 5 + Mongoose 9, ESM, JavaScript. Entry `src/index.js`, app `src/app.js`.
- **Frontend:** `client/` folder (React + Vite + Tailwind v4), self-contained with its own package.json. Specs in `docs/`.
- API base `/api/v1`, envelope `{ success, message, data, meta }`, errors `{ success, message, errors }`.

## Non-negotiables

1. **Docs are the contract.** `docs/03-api-contract.md` must match reality. Any endpoint/payload change: update backend → update doc → then client.
2. **Response envelope.** Controllers return `new ApiResponse(status, data, message)`. Errors via `throw new ApiError(status, message, errors)`.
3. **Auth.** httpOnly cookies (`accessToken`, `refreshToken`) + Bearer fallback. Never expose tokens to JS storage. Email verification is an **email OTP** (`isEmailVerified` + hashed 6-digit code, see `docs/04` § 1) — changing the strategy is a product decision, so update the docs first.
4. **Authorization.** Project-level checks go through `validateProjectPermission([...roles])`. Object-level checks (owner) live in controllers.
5. **Validation.** express-validator chains in `src/validators/index.js`, always followed by `validate` middleware. Field errors land in `errors: { field: [msgs] }`.
6. **Async handlers.** Wrap controllers in `asyncHandler`. Never leave a floating promise.
7. **Errors.** Central `errorHandler` maps Mongoose/multer/JSON errors to 4xx. Throw typed ApiErrors — don't res.status inside catch blocks.
8. **Mail.** Via `sendEmail` util. Dev uses auto-configured Ethereal (preview URL in console). No Mailtrap-specific code — legacy env vars supported for compatibility only.
9. **No new runtime dependencies** (backend or client) without updating the stack table in `docs/02-architecture.md` and getting an OK.

## Code style

- Backend: ESLint + Prettier enforced — run `npm run lint` and `npm run format` before finishing
- 2-space indent, single quotes, semicolons, arrow callbacks, no unused vars (`_` prefix to keep)
- File naming: `domain.controllers.js`, `domain.routes.js`, `domain.models.js` (backend); `PascalCase.jsx` components, `camelCase.js` logic (client)
- Comments explain *why*, not *what*

## Backend conventions

- Controllers: one file per domain, exported as named functions
- Routes: thin — validators → `validate` → permission middleware → multer (if multipart) → controller; Swagger `@openapi` YAML block above each route
- Cascade deletes use transactions (`session.startTransaction()`)
- Mongoose models: indexes declared in schema, `timestamps: true`
- Env vars documented in `.ENV.SAMPLE` — no `process.env` reads outside config-sensitive utils

## Frontend conventions (client/)

- Vertical slices: `features/<domain>/` owns its pages; shared logic in `stores/`, `api/`, `hooks/`, `lib/`
- `api/` modules are plain fetch functions — no React imports
- Forms map backend `errors: { field: [msgs] }` to inline field errors; 409s are field errors, not toasts
- Guards render synchronously from `authStore.status` — they don't fetch
- Tailwind only for styling; theme tokens in `styles/theme.css`; dark mode via class strategy
- Every list view: loading skeleton, empty state, error state

## Verification before "done"

```bash
# backend
npm run lint          # must pass
npm run dev           # boots, admin bootstrap log appears
# API smoke: GET /api/v1/healthcheck → 200

# frontend (in client/)
npm run lint
npm run build         # must pass
```

Plus: feature's acceptance criteria from `docs/05-implementation-plan.md` all checked.

## Session log

Append one row per completed feature in `docs/06-agentic-workflow.md` § 6.

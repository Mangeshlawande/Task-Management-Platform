/*
 * API client — the only place that talks to the network.
 * Contract: docs/03-api-contract.md
 *  - Every response is the envelope { success, message, data, meta } → we unwrap `data`
 *  - Errors: { success, message, errors: { field: [msgs] } } → ApiError with .fieldErrors
 *  - Auth: httpOnly cookies (credentials: 'include'), same-origin via Vite proxy
 *  - 401 → one silent refresh + retry; refresh failure → session cleared
 *
 * Mock mode: with VITE_USE_MOCK_API=true every request is served by the
 * in-memory server in lib/mock/mock-server.js instead of fetch — no backend
 * needed for UI demos. The mock throws the same ApiError, so feature code is
 * unaffected (see `useMockApi` below).
 */
import { ApiError } from './errors.js';
import { handleMockRequest } from '../lib/mock/mock-server.js';

export { ApiError };

const useMockApi =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_USE_MOCK_API === 'true';

let refreshingPromise = null;

async function refreshSession() {
  // Serialized: concurrent 401s share one in-flight refresh call.
  if (!refreshingPromise) {
    refreshingPromise = fetch('/api/v1/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(res.status, body.message || 'Session expired');
        return body.data;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

// Set by stores/authStore.js — avoids a circular import; the client must stay
// framework/store-agnostic. authStore.clearSession() runs on final 401.
let onSessionExpired = null;
export function setSessionExpiredHandler(fn) {
  onSessionExpired = typeof fn === 'function' ? fn : null;
}

/*
 * Connection events for the offline banner (docs/07 § 2.3). Dispatched on
 * `window` so the banner can subscribe without importing the client's
 * internals: 'pc:api-down' when fetch itself fails (server unreachable),
 * 'pc:api-up' on the next response of any kind (server reachable again).
 */
const emit = (name) =>
  typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent(name));

/** Route one request through the in-memory mock server (mock mode only). */
async function mockRequest(path, { method, body, formData, retry = true }) {
  try {
    const payload = await handleMockRequest(method, path, {
      body: formData ?? body,
    });
    return payload?.data;
  } catch (err) {
    if (err instanceof ApiError) {
      // Parity with the fetch path: an INVALID_TOKEN 401 means the session is
      // gone (the mock never expires sessions; logout/change-password clear
      // db.session directly) → surface the same "session expired" behaviour.
      const isExpiredSession =
        err.status === 401 &&
        Array.isArray(err.codes) &&
        err.codes.includes('INVALID_TOKEN');
      const isAuthEndpoint =
        path.includes('/auth/login') || path.includes('/auth/register');
      if (isExpiredSession && !isAuthEndpoint && retry) {
        onSessionExpired?.();
        throw new ApiError(401, 'Your session has expired. Please log in again.');
      }
      throw err;
    }
    throw new ApiError(0, err?.message || 'Mock request failed.');
  }
}

async function request(path, { method = 'GET', body, formData, retry = true } = {}) {
  if (useMockApi) {
    return mockRequest(path, { method, body, formData, retry });
  }

  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include', // send/receive httpOnly cookies
      headers: formData ? undefined : { 'Content-Type': 'application/json' },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    emit('pc:api-down');
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  // We got a response — the server is up (even a 500 counts as reachable).
  emit('pc:api-up');

  // 401 → silent refresh + retry ONLY when it's really an expired/invalid
  // session. The backend marks auth-middleware 401s with ['INVALID_TOKEN'];
  // credential failures (bad login, wrong current password) arrive unmarked
  // and must surface to the user, not trigger a refresh cycle.
  const body401 = res.status === 401 ? await res.json().catch(() => ({})) : null;
  const isExpiredSession =
    res.status === 401 && Array.isArray(body401?.errors) && body401.errors.includes('INVALID_TOKEN');
  const isAuthEndpoint =
    path.includes('/auth/login') || path.includes('/auth/register');
  // `retry` is false on the retried request, so a refresh can never loop.
  if (res.status === 401 && isExpiredSession && !isAuthEndpoint && retry) {
    try {
      await refreshSession();
      return request(path, { method, body, formData, retry: false });
    } catch {
      onSessionExpired?.();
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
  }

  const payload = body401 ?? (await res.json().catch(() => ({})));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload.message || `Request failed (${res.status})`,
      // normalize: backend sends object for validation errors, array otherwise
      payload.errors && !Array.isArray(payload.errors) ? payload.errors : {},
    );
  }

  return payload?.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  postForm: (path, formData) => request(path, { method: 'POST', formData }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

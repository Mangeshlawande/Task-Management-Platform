/*
 * API client — the only place that talks to the network.
 * Contract: docs/03-api-contract.md
 *  - Every response is the envelope { success, message, data, meta } → we unwrap `data`
 *  - Errors: { success, message, errors: { field: [msgs] } } → ApiError with .fieldErrors
 *  - Auth: httpOnly cookies (credentials: 'include'), same-origin via Vite proxy
 *  - 401 → one silent refresh + retry; refresh failure → session cleared
 */

export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors; // { field: [messages] }
  }
}

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

async function request(path, { method = 'GET', body, formData, retry = true } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include', // send/receive httpOnly cookies
      headers: formData ? undefined : { 'Content-Type': 'application/json' },
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

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

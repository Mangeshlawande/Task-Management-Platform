/*
 * ApiError lives in its own module because the mock server (lib/mock/) raises
 * protocol-level errors and must not import the fetch-based api/client.js —
 * that would be a circular import once the mock intercepts requests.
 *
 * api/client.js re-exports this class as its public `ApiError`, so existing
 * `import { ApiError } from '../api/client.js'` call sites keep working.
 */
export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Normalized contract shape: { field: [messages] }. The backend sends an
    // object for validation errors and an array of codes otherwise.
    this.fieldErrors = fieldErrors;
  }
}

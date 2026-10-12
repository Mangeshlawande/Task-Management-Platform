// Auth API — contract rows in docs/03-api-contract.md § Auth
import { api } from './client.js';

export const authApi = {
  /** Creates the account and logs the user in — no verification step.
   *  Returns { user, accessToken, refreshToken } with cookies already set. */
  register: ({ email, username, password, fullName }) =>
    api.post('/api/v1/auth/register', {
      email,
      username: username.toLowerCase(),
      password,
      fullName: fullName || undefined,
    }),

  login: ({ identifier, password }) =>
    api.post('/api/v1/auth/login', {
      password,
      // backend accepts either email or username — one identifier field in UI
      ...(identifier.includes('@') ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() }),
    }),

  me: () => api.get('/api/v1/auth/me'),

  logout: () => api.post('/api/v1/auth/logout'),

  changePassword: ({ oldPassword, newPassword }) =>
    api.post('/api/v1/auth/change-password', { oldPassword, newPassword }),
};

// Auth API — contract rows in docs/03-api-contract.md § Auth
import { api } from './client.js';

export const authApi = {
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

  /** Consumes the emailed 6-digit code. On success the API also logs the
   *  user in (httpOnly cookies) — data = { user, accessToken, refreshToken }. */
  verifyEmailOtp: ({ email, otp }) =>
    api.post('/api/v1/auth/verify-otp', { email: email.toLowerCase(), otp }),

  /** Returns { devOtp } outside production so the code can be shown on screen. */
  resendEmailOtp: (email) =>
    api.post('/api/v1/auth/resend-otp', { email: email.toLowerCase() }),

  me: () => api.get('/api/v1/auth/me'),

  logout: () => api.post('/api/v1/auth/logout'),

  changePassword: ({ oldPassword, newPassword }) =>
    api.post('/api/v1/auth/change-password', { oldPassword, newPassword }),

  forgotPassword: (email) => api.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (resetToken, newPassword) =>
    api.post(`/api/v1/auth/reset-password/${resetToken}`, { newPassword }),
};

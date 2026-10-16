import { create } from 'zustand';
import { authApi } from '../api/auth.js';
import { setSessionExpiredHandler } from '../api/client.js';
import { useCacheStore } from './cacheStore.js';

/**
 * Session state. Server data (user) lives here because guards and layout
 * need it synchronously; all other server data stays in feature hooks.
 * See docs/04-auth-flow.md § 9.
 */

const initial = { user: null, status: 'idle' }; // idle | loading | authenticated | unauthenticated

export const useAuthStore = create((set, get) => ({
  ...initial,

  /** Called once by <RequireAuth> on mount; hydrates the session via GET /me. */
  async bootstrap() {
    const { status, user } = get();
    if (status === 'loading' || (status === 'authenticated' && user)) return;

    set({ status: 'loading' });
    try {
      const user = await authApi.me();
      set({ user, status: 'authenticated' });
    } catch {
      set({ ...initial, status: 'unauthenticated' });
    }
  },

  async login(credentials) {
    useCacheStore.getState().clear();
    // Contract: data = { user, accessToken, refreshToken } — keep the user.
    const data = await authApi.login(credentials);
    const user = data?.user ?? data;
    set({ user, status: 'authenticated' });
    return user;
  },

  /** Register does NOT log the user in (contract returns the user only). */
  setUser(user) {
    useCacheStore.getState().clear();
    set({ user, status: user ? 'authenticated' : 'unauthenticated' });
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      useCacheStore.getState().clear();
      set({ ...initial, status: 'unauthenticated' });
    }
  },

  async deleteAccount() {
    try {
      await authApi.deleteAccount();
    } finally {
      useCacheStore.getState().clear();
      set({ ...initial, status: 'unauthenticated' });
    }
  },

  clearSession() {
    useCacheStore.getState().clear();
    set({ ...initial, status: 'unauthenticated' });
  },
}));

// Wire the api client's final-401 hook to store clearing (avoids circular import).
setSessionExpiredHandler(() => useAuthStore.getState().clearSession());

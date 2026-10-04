import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** UI-only state: theme, toasts. Persisted under 'project-camp-ui' (index.html reads theme pre-paint). */

const applyTheme = (theme) => {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const useUiStore = create(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme(theme) {
        applyTheme(theme === 'system' ? getSystemTheme() : theme);
        set({ theme });
      },

      toasts: [],

      toast({ type = 'info', message, duration = 4000 }) {
        const id = crypto.randomUUID();
        set({ toasts: [...get().toasts, { id, type, message }] });
        setTimeout(() => get().dismissToast(id), duration);
        return id;
      },

      dismissToast(id) {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      },
    }),
    {
      name: 'project-camp-ui',
      partialize: (s) => ({ theme: s.theme }), // toasts are not persisted
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme === 'system' ? getSystemTheme() : state.theme);
      },
    },
  ),
);

export const toast = {
  success: (message) => useUiStore.getState().toast({ type: 'success', message }),
  error: (message) => useUiStore.getState().toast({ type: 'error', message, duration: 6000 }),
  info: (message) => useUiStore.getState().toast({ type: 'info', message }),
};

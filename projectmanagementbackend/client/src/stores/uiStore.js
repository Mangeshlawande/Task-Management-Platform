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

      /* Command palette (⌘K) — open flag + one-shot "create" intent that the
         target page consumes after the palette navigates to it. Not persisted. */
      paletteOpen: false,

      openPalette() {
        set({ paletteOpen: true });
      },

      closePalette() {
        set({ paletteOpen: false });
      },

      togglePalette() {
        set((s) => ({ paletteOpen: !s.paletteOpen }));
      },

      /** { kind: 'project' | 'task' | 'note', projectId?, ts } */
      pendingCreate: null,

      setPendingCreate(pending) {
        set({ pendingCreate: pending });
      },
    }),
    {
      name: 'project-camp-ui',
      partialize: (s) => ({ theme: s.theme }), // toasts/palette/pending are not persisted
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme === 'system' ? getSystemTheme() : state.theme);
      },
    },
  ),
);

/**
 * One-shot read of a palette "create" intent (CommandPalette navigates, the
 * target page calls this on mount). Only the matching page clears it, so a
 * page rendered mid-navigation can't swallow another page's intent. Returns
 * the intent only when it is younger than 15 s, so a stale one never pops a
 * modal much later.
 */
export const consumePendingCreate = (kind) => {
  const { pendingCreate, setPendingCreate } = useUiStore.getState();
  if (!pendingCreate || pendingCreate.kind !== kind) return null;
  setPendingCreate(null);
  const fresh = Date.now() - (pendingCreate.ts ?? 0) < 15_000;
  return fresh ? pendingCreate : null;
};

export const toast = {
  success: (message) => useUiStore.getState().toast({ type: 'success', message }),
  error: (message) => useUiStore.getState().toast({ type: 'error', message, duration: 6000 }),
  info: (message) => useUiStore.getState().toast({ type: 'info', message }),
};

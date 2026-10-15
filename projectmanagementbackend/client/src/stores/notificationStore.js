import { create } from 'zustand';

const STORAGE_KEY = 'workpulse_read_notifications';

function getReadIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Zustand In-App Notification Store
 *
 * Tracks notifications for task assignments, overdue deadlines, discussions,
 * and project updates. Persists read states in localStorage.
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  readIds: getReadIds(),

  /**
   * Set or update notification list (derived from live project tasks and comments)
   */
  syncNotifications(items) {
    const readIds = get().readIds;
    const processed = items.map((item) => ({
      ...item,
      read: readIds.has(item.id),
    }));

    // Sort newest first
    processed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    set({ notifications: processed });
  },

  /**
   * Mark a single notification as read
   */
  markAsRead(id) {
    const readIds = new Set(get().readIds);
    readIds.add(id);
    saveReadIds(readIds);

    set((state) => ({
      readIds,
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  /**
   * Mark all current notifications as read
   */
  markAllAsRead() {
    const current = get().notifications;
    const readIds = new Set(get().readIds);
    current.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);

    set({
      readIds,
      notifications: current.map((n) => ({ ...n, read: true })),
    });
  },

  /**
   * Clear all notifications
   */
  clearAll() {
    set({ notifications: [] });
  },
}));

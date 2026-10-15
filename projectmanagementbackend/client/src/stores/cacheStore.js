import { create } from 'zustand';

/**
 * Zustand Query & Data Cache Store
 *
 * Prevents redundant database queries and repeated user validations when
 * navigating across pages or requesting the same endpoints repeatedly.
 *
 * Default TTL: 60 seconds.
 * Auto-invalidates related cache keys on mutations (POST, PUT, DELETE).
 */

const DEFAULT_TTL = 120 * 1000; // 120 seconds (2 minutes)

export const useCacheStore = create((set, get) => ({
  cache: new Map(), // key -> { data, expiresAt, timestamp }

  /**
   * Get cached data if valid and not expired.
   * Returns null if missing or expired.
   */
  get(key) {
    const entry = get().cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Expired entry - remove lazily
      const newCache = new Map(get().cache);
      newCache.delete(key);
      set({ cache: newCache });
      return null;
    }

    return entry.data;
  },

  /**
   * Set cached data with optional TTL (in milliseconds).
   */
  set(key, data, ttl = DEFAULT_TTL) {
    const expiresAt = Date.now() + (ttl || DEFAULT_TTL);
    const newCache = new Map(get().cache);
    newCache.set(key, { data, expiresAt, timestamp: Date.now() });
    set({ cache: newCache });
  },

  /**
   * Invalidate exact key or keys matching prefix/pattern.
   */
  invalidate(pattern) {
    const current = get().cache;
    let changed = false;
    const newCache = new Map(current);

    if (typeof pattern === 'string') {
      for (const key of current.keys()) {
        if (key === pattern || key.includes(pattern)) {
          newCache.delete(key);
          changed = true;
        }
      }
    } else if (pattern instanceof RegExp) {
      for (const key of current.keys()) {
        if (pattern.test(key)) {
          newCache.delete(key);
          changed = true;
        }
      }
    }

    if (changed) {
      set({ cache: newCache });
    }
  },

  /**
   * Clear entire query cache (e.g. on logout or user switch).
   */
  clear() {
    set({ cache: new Map() });
  },
}));

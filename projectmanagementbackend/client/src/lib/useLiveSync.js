import { useEffect, useRef } from 'react';

/**
 * useLiveSync
 *
 * Background polling and window-focus synchronization hook.
 * Silently triggers `onSync` at regular intervals and when the user switches
 * back to the application tab without triggering disruptive UI loading spinners.
 */
export function useLiveSync({ onSync, intervalMs = 30000, enabled = true }) {
  const syncRef = useRef(onSync);
  syncRef.current = onSync;

  useEffect(() => {
    if (!enabled || typeof syncRef.current !== 'function') return;

    // 1. Window focus / visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRef.current(true); // silent revalidation
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // 2. Periodic background polling timer
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncRef.current(true); // silent revalidation
      }
    }, intervalMs);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}

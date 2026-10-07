import { useEffect, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

/**
 * ConnectionBanner (docs/07 § 2.3 / TESTCASES NF-06).
 *
 * Two signals, both live outside React:
 *  - browser online/offline (`navigator.onLine` + window events)
 *  - API reachability — api/client.js dispatches `pc:api-down` when fetch
 *    itself fails and `pc:api-up` on the next response of any kind.
 *
 * While down, a lightweight probe hits `/api/v1/healthcheck` every 5 s (plus
 * a manual Retry) so recovery doesn't depend on the user doing something.
 * Mounted once in ProtectedLayout; renders nothing when everything is fine.
 */
const PROBE_URL = '/api/v1/healthcheck';
const PROBE_INTERVAL_MS = 5000;

export function ConnectionBanner() {
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  );
  const [apiDown, setApiDown] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const goOnline = () => setBrowserOnline(true);
    const goOffline = () => {
      setBrowserOnline(false);
      setApiDown(true);
    };
    const onApiDown = () => setApiDown(true);
    const onApiUp = () => setApiDown(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('pc:api-down', onApiDown);
    window.addEventListener('pc:api-up', onApiUp);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('pc:api-down', onApiDown);
      window.removeEventListener('pc:api-up', onApiUp);
    };
  }, []);

  const down = !browserOnline || apiDown;

  // Probe while down: browser online (probing makes no sense offline — the
  // 'online' event will re-trigger this) and something is wrong.
  useEffect(() => {
    if (!down || !browserOnline) return undefined;

    const probe = async () => {
      try {
        const res = await fetch(PROBE_URL, { cache: 'no-store' });
        if (res.ok) setApiDown(false);
      } catch {
        /* still down — keep waiting */
      }
    };

    probe();
    timerRef.current = setInterval(probe, PROBE_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [down, browserOnline]);

  if (!down) return null;

  const message = browserOnline
    ? 'Cannot reach the server — retrying automatically…'
    : 'You are offline — changes will not be saved until the connection returns.';

  return (
    <div
      role="status"
      aria-label="Connection status"
      aria-live="polite"
      className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-foreground dark:text-dark-foreground"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-warning" aria-hidden />
        {message}
        {browserOnline && (
          <button
            type="button"
            onClick={() => {
              setApiDown(true);
              // force an immediate probe by poking the effect through a
              // fetch here; the interval covers the rest.
              fetch(PROBE_URL, { cache: 'no-store' })
                .then((res) => {
                  if (res.ok) setApiDown(false);
                })
                .catch(() => {});
            }}
            className="ml-1 inline-flex items-center gap-1 rounded border border-warning/50 px-2 py-0.5 text-xs font-medium text-foreground transition hover:bg-warning/20 dark:text-dark-foreground"
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
            Retry
          </button>
        )}
      </span>
    </div>
  );
}

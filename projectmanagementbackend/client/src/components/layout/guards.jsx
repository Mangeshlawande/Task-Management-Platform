import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { Loader2 } from 'lucide-react';

/**
 * Guards render synchronously from store status — they never fetch.
 * Only bootstrap() talks to the API (docs/04-auth-flow.md § 8).
 */

export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const location = useLocation();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** For /login, /register — bounce to app if a session already exists. */
export function RedirectIfAuthed() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const location = useLocation();

  useEffect(() => {
    // Check for an existing cookie session so refresh on /login lands in the app.
    if (status === 'idle') bootstrap();
  }, [status, bootstrap]);

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from || '/projects'} replace />;
  }

  return <Outlet />;
}

import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { Avatar, Button, Logo, ThemeToggle } from '../ui/index.js';

/** App shell for authenticated pages. Sidebar/nav arrives with P2. */
export function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt dark:bg-dark-surface-alt">
      <header className="border-b border-border bg-card dark:border-dark-border dark:bg-dark-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/projects" aria-label="Project Camp home">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                <Avatar user={user} size="sm" />
                <span className="hidden text-sm font-medium text-foreground sm:block dark:text-dark-foreground">
                  {user.fullName || user.username}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              loading={busy}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </Button>
            <Link
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className="rounded-lg p-2 text-muted transition hover:bg-surface-alt hover:text-foreground dark:text-dark-muted dark:hover:bg-dark-surface-alt dark:hover:text-dark-foreground"
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

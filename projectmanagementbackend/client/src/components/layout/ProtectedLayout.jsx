import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Search, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { Avatar, Button, Logo, ThemeToggle } from '../ui/index.js';
import { CommandPalette } from './CommandPalette.jsx';
import { ConnectionBanner } from './ConnectionBanner.jsx';

/** App shell for authenticated pages. Sidebar/nav arrives with P2. */
export function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const openPalette = useUiStore((s) => s.openPalette);
  const togglePalette = useUiStore((s) => s.togglePalette);

  // Global ⌘K / Ctrl+K binding (docs/07 § 2.2).
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePalette]);

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
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette (Control or Command + K)"
              className="hidden items-center gap-2 rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-xs text-muted transition hover:text-foreground sm:inline-flex dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-muted dark:hover:text-dark-foreground"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span>Search</span>
              <kbd className="rounded border border-border px-1 text-[10px] dark:border-dark-border">
                ⌘K
              </kbd>
            </button>
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

      <ConnectionBanner />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <CommandPalette onLogout={handleLogout} />
    </div>
  );
}

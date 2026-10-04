import { Outlet } from 'react-router-dom';
import { Logo, ThemeToggle } from '../ui/index.js';

/** Centered card layout for auth pages. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-alt dark:bg-dark-surface-alt">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Outlet />
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-muted dark:text-dark-muted">
        Project Camp — collaborative project management
      </footer>
    </div>
  );
}

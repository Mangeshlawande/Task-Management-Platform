import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, PanelLeft, Menu, Search, Settings, X, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { Avatar, Logo } from '../ui/index.js';
import { Sidebar } from './Sidebar.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { ConnectionBanner } from './ConnectionBanner.jsx';
import { NotificationCenter } from './NotificationCenter.jsx';
import { HelpModal } from '../common/HelpModal.jsx';
import { syncUserNotifications } from '../../lib/syncNotifications.js';
import { useLiveSync } from '../../lib/useLiveSync.js';

/** App shell for authenticated pages with responsive sidebar and topbar navigation. */
export function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/dashboard' || location.pathname === '/';
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);
  const openMobileSidebar = useUiStore((s) => s.openMobileSidebar);

  const openPalette = useUiStore((s) => s.openPalette);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const openHelp = useUiStore((s) => s.openHelp);
  const closeHelp = useUiStore((s) => s.closeHelp);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

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

  // Initial and live background notification synchronization
  useEffect(() => {
    if (user) {
      syncUserNotifications(user);
    }
  }, [user]);

  useLiveSync({
    enabled: Boolean(user),
    intervalMs: 30000,
    onSync: () => {
      if (user) syncUserNotifications(user);
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden h-full flex-shrink-0 md:flex">
        <Sidebar onLogout={handleLogout} />
      </div>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close mobile menu"
                className="absolute right-3 top-3.5 z-20 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile navigation"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar (shift layout)' : 'Collapse sidebar (shift layout)'}
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition hover:bg-accent hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary md:inline-flex shrink-0"
            >
              <PanelLeft
                className="h-4 w-4"
                aria-hidden
              />
            </button>

            {/* Smart Navigation: Back & Home (Desktop/Tablet) */}
            {isHome ? (
              <Link
                to="/dashboard"
                aria-label="Home"
                title="Home (Dashboard)"
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
              >
                <Home className="h-3.5 w-3.5" aria-hidden />
                <span>Home</span>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  aria-label="Go back to previous page"
                  title="Go back"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  <span>Back</span>
                </button>

                <Link
                  to="/dashboard"
                  aria-label="Go to Dashboard (Home)"
                  title="Home (Dashboard)"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                >
                  <Home className="h-3.5 w-3.5" aria-hidden />
                  <span>Home</span>
                </Link>
              </div>
            )}

            {/* Mobile Brand / Logo */}
            <Link to="/dashboard" aria-label="WorkPulse home" className="md:hidden shrink-0 flex items-center">
              <Logo />
            </Link>

            {/* Search Input for sm+ screens */}
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette (Control or Command + K)"
              className="hidden sm:flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 text-left truncate">Search projects, tasks, notes…</span>
              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium font-sans md:inline-block">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Topbar Actions */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Mobile Search Button (< sm) */}
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search"
              className="sm:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notifications */}
            <NotificationCenter />

            {/* Desktop Only Actions - Available in mobile sidebar for mobile users */}
            <button
              type="button"
              onClick={openHelp}
              aria-label="System overview & help guide"
              title="System overview & help guide"
              className="hidden md:inline-flex rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
            </button>

            {user && (
              <Link
                to="/profile"
                className="hidden md:flex group items-center gap-2 rounded-lg p-1 transition hover:bg-muted"
                title="View your profile"
              >
                <Avatar user={user} size="sm" />
                <span className="hidden text-sm font-medium text-foreground group-hover:text-primary sm:block">
                  {user.fullName || user.username}
                </span>
              </Link>
            )}

            <Link
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className="hidden md:inline-flex rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </header>

        <ConnectionBanner />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette onLogout={handleLogout} />
      <HelpModal open={helpOpen} onClose={closeHelp} />
    </div>
  );
}

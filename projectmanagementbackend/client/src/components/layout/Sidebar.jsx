import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  CircleUser,
  Activity,
  HelpCircle,
  LogOut,
  KanbanSquare,
  MessageSquare,
  StickyNote,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useCacheStore } from '../../stores/cacheStore.js';
import { Avatar } from '../ui/Avatar.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/members', label: 'Members', icon: Users },
];

const footerNav = [
  { to: '/profile', label: 'Profile', icon: CircleUser },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onNavigate, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const openHelp = useUiStore((s) => s.openHelp);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const match = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = match ? match[1] : null;
  const isProjectPage = Boolean(projectId && projectId !== 'new');
  const cachedProject = isProjectPage ? useCacheStore.getState().get(`/api/v1/projects/${projectId}`) : null;

  const handleLogout = async () => {
    onNavigate?.();
    if (onLogout) {
      await onLogout();
    } else {
      await logout();
      navigate('/login', { replace: true });
    }
  };

  const handleHelp = () => {
    onNavigate?.();
    openHelp();
  };

  return (
    <aside
      className={`flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex h-14 items-center gap-2.5 ${
          collapsed ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0"
          title="WorkPulse Home"
          aria-label="WorkPulse home"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.62_0.2_310)] text-primary-foreground shadow-sm">
            <Activity className="h-4 w-4" aria-hidden />
          </div>
          {!collapsed && (
            <span className="font-semibold tracking-tight text-sm truncate">
              Work<span className="text-primary font-bold">Pulse</span>
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
        {nav.map((item) => {
          const active =
            item.to === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0 w-10 mx-auto' : ''
              } ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-sidebar-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Mobile-Only Project Section Tabs (visible only when inside a project on mobile) */}
        {isProjectPage && (
          <div className="md:hidden mt-3 pt-3 border-t border-sidebar-border/70 space-y-1">
            <div className="px-3 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-primary">
              <span className="truncate">{cachedProject?.name ? `Project: ${cachedProject.name}` : 'Project Sections'}</span>
              <span className="text-[10px] lowercase text-sidebar-foreground/50 shrink-0">6 tabs</span>
            </div>
            <div className="space-y-0.5">
              {[
                { to: `/projects/${projectId}`, exact: true, label: 'Dashboard', icon: LayoutDashboard },
                { to: `/projects/${projectId}/board`, label: 'Board', icon: KanbanSquare },
                { to: `/projects/${projectId}/discussions`, label: 'Comments & Views', icon: MessageSquare },
                { to: `/projects/${projectId}/notes`, label: 'Notes', icon: StickyNote },
                { to: `/projects/${projectId}/members`, label: 'Members', icon: Users },
                { to: `/projects/${projectId}/settings`, label: 'Settings', icon: Settings },
              ].map((tab) => {
                const active = tab.exact
                  ? pathname === `/projects/${projectId}` || pathname === `/projects/${projectId}/`
                  : pathname.startsWith(tab.to) ||
                    (tab.label === 'Board' && pathname.includes('/tasks')) ||
                    (tab.label === 'Comments & Views' && pathname.includes('/comments'));

                return (
                  <Link
                    key={tab.label}
                    to={tab.to}
                    onClick={onNavigate}
                    className={`group relative flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <tab.icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {active && <ChevronRight className="h-3 w-3 text-primary shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Desktop Footer Navigation */}
      <div className="hidden md:block border-t border-sidebar-border px-2 py-2.5 space-y-1">
        {footerNav.map((item) => {
          const active = pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0 w-10 mx-auto' : ''
              } ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Theme Toggle (Desktop) */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            <ThemeToggle compact />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-sidebar-border/70 bg-sidebar-accent/20 px-2.5 py-1.5 my-1">
            <span className="text-xs font-medium text-sidebar-foreground/75">Theme</span>
            <ThemeToggle />
          </div>
        )}

        {/* Log Out Button (Desktop) */}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`flex items-center gap-3 rounded-md text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600 ${
            collapsed ? 'h-10 w-10 mx-auto justify-center px-0' : 'w-full px-3 py-2'
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          {!collapsed && <span className="truncate">Log out</span>}
        </button>
      </div>

      {/* Mobile-Only Section: Moved from topbar for mobile users */}
      <div className="md:hidden border-t border-sidebar-border p-3 space-y-2.5 bg-sidebar-accent/10">
        {/* User Card */}
        {user && (
          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2 transition hover:bg-sidebar-accent/60"
          >
            <Avatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user.fullName || user.username}
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                {user.email || `@${user.username}`}
              </p>
            </div>
          </Link>
        )}

        {/* Mobile Navigation Links */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={handleHelp}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
          >
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span>Help &amp; System Guide</span>
          </button>

          <Link
            to="/settings"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/20 px-2.5 py-1.5">
          <span className="text-xs font-medium text-sidebar-foreground/75">Theme</span>
          <ThemeToggle />
        </div>

        {/* Log Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/20"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

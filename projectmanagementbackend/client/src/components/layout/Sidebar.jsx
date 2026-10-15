import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  CircleUser,
  Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore.js';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/members', label: 'Members', icon: Users },
];

const footerNav = [
  { to: '/profile', label: 'Profile', icon: CircleUser },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onNavigate }) {
  const location = useLocation();
  const pathname = location.pathname;
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

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
      </nav>

      {/* Footer Navigation */}
      <div className="border-t border-sidebar-border px-2 py-2.5 space-y-1">
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
      </div>
    </aside>
  );
}

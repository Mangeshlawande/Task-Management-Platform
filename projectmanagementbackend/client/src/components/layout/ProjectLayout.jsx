import { NavLink, Outlet, useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  LayoutDashboard,
  KanbanSquare,
  MessageSquare,
  StickyNote,
  Users,
  Settings,
  ChevronDown,
  Check,
} from 'lucide-react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useProjectDetail } from '../../features/projects/useProjectDetail.js';
import { useUiStore } from '../../stores/uiStore.js';
import { Badge, Button, Skeleton } from '../ui/index.js';
import {
  formatDate,
  fromNow,
  memberCountLabel,
  roleBadgeVariant,
  roleLabel,
} from '../../lib/format.js';

/**
 * P2.3 — Project shell. Wraps every tab (dashboard / tasks / discussions / notes / members /
 * settings) so they share one data load and one permission source.
 *
 * Tabs are real routes (`/projects/:id`, `/projects/:id/tasks`, …) so every
 * tab is deep-linkable and refresh-safe.
 *
 * The detail hook's value is shared via context so tab pages and the shell
 * read the same project/members/myRole without prop drilling or refetching.
 */
const ProjectContext = createContext(null);

/** Read the shell's project/members/myRole from inside a tab page. */
export const useProject = () => useContext(ProjectContext);

const TABS = [
  { to: '.', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: 'board', label: 'Board', icon: KanbanSquare },
  { to: 'discussions', label: 'Comments & Views', icon: MessageSquare },
  { to: 'notes', label: 'Notes', icon: StickyNote },
  { to: 'members', label: 'Members', icon: Users },
  { to: 'settings', label: 'Settings', icon: Settings },
];

export function ProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const tabsContainerRef = useRef(null);
  const moreMenuRef = useRef(null);

  const detail = useProjectDetail(projectId);
  const { project, members, tasks, myRole, status, error, reload } = detail;

  // Auto-scroll active tab into center of sliding window
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector('[aria-current="page"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [location.pathname]);

  // Click outside listener to dismiss the More dropdown
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [moreMenuOpen]);

  const memberCount = project?.members ?? members.length;
  const projectTasks = tasks || [];
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;
  const progress = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0;

  if (status === 'loading') {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-5 w-40" />
        <div className="app-card p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <Skeleton className="mt-6 h-9 w-72 max-w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="app-card p-6 text-center" role="alert">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden />
        <p className="mt-3 font-medium text-foreground">
          Couldn&rsquo;t open this project
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={reload}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            Back to projects
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          If the project was deleted — or you were removed from it — this is
          expected.
        </p>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={detail}>
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/projects" className="transition hover:text-foreground">
            Projects
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="font-medium text-foreground truncate max-w-xs">{project.name}</span>
        </nav>

        <header className="app-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-[oklch(0.6_0.2_310)]/20 font-display text-xl font-semibold text-primary">
                  {project.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {memberCountLabel(memberCount)}
                </span>
                {project.createdAt && <span>Created {formatDate(project.createdAt)}</span>}
                <span>Updated {fromNow(project.updatedAt ?? project.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_310)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={roleBadgeVariant(myRole)}>{roleLabel(myRole)}</Badge>
            </div>
          </div>
        </header>

        <nav aria-label="Project sections" className="relative">
          {/* Responsive Sliding Window Tab Bar with Quick-More Dropdown */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
            {/* Sliding Window: Smooth horizontal swipe/scroll on mobile, never wraps onto multiple lines */}
            <div
              ref={tabsContainerRef}
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 scroll-smooth scrollbar-none snap-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {TABS.map(({ to, end, label, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `snap-start shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">{label}</span>
                </NavLink>
              ))}
            </div>

            {/* Mobile "More ▾" Quick Jump Menu (for mobile users who prefer 1-tap dropdown) */}
            <div className="relative shrink-0 md:hidden" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((o) => !o)}
                aria-expanded={moreMenuOpen}
                aria-label="More project sections"
                className={`inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold shadow-xs transition ${
                  moreMenuOpen
                    ? 'bg-accent text-accent-foreground border-primary/50'
                    : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>More</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    moreMenuOpen ? 'rotate-180 text-primary' : ''
                  }`}
                  aria-hidden
                />
              </button>

              {/* Dropdown Menu */}
              {moreMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                    All Project Tabs (6)
                  </div>
                  <div className="space-y-0.5">
                    {TABS.map(({ to, end, label, icon: Icon }) => {
                      const isActive = end
                        ? location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`
                        : location.pathname.includes(`/projects/${projectId}/${to}`) ||
                          (to === 'board' && location.pathname.includes('/tasks')) ||
                          (to === 'discussions' && location.pathname.includes('/comments'));

                      return (
                        <NavLink
                          key={label}
                          to={to}
                          end={end}
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                            <span className="truncate">{label}</span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        <Outlet />
      </div>
    </ProjectContext.Provider>
  );
}

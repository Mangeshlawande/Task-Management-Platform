import { NavLink, Outlet, useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  LayoutDashboard,
  KanbanSquare,
  StickyNote,
  Users,
  Settings,
} from 'lucide-react';
import { createContext, useContext } from 'react';
import { useProjectDetail } from '../../features/projects/useProjectDetail.js';
import { Badge, Button, Skeleton } from '../ui/index.js';
import {
  formatDate,
  memberCountLabel,
  roleBadgeVariant,
  roleLabel,
} from '../../lib/format.js';

/**
 * P2.3 — Project shell. Wraps every tab (dashboard / board / notes / members /
 * settings) so they share one data load and one permission source.
 *
 * Tabs are real routes (`/projects/:id`, `/projects/:id/board`, …) so every
 * tab is deep-linkable and refresh-safe (docs/05 P2.3 "done when").
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
  { to: 'notes', label: 'Notes', icon: StickyNote },
  { to: 'members', label: 'Members', icon: Users },
  { to: 'settings', label: 'Settings', icon: Settings },
];

export function ProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const detail = useProjectDetail(projectId);
  const { project, members, myRole, status, error, reload } = detail;

  const memberCount = project?.members ?? members.length;

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
        <p className="mt-3 font-medium text-foreground dark:text-dark-foreground">
          Couldn&rsquo;t open this project
        </p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={reload}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            Back to projects
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted dark:text-dark-muted">
          If the project was deleted — or you were removed from it — this is
          expected.
        </p>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={detail}>
      <div className="space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All projects
        </Link>

        <header className="app-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted dark:text-dark-muted">
                  {project.description}
                </p>
              )}
            </div>
            <Badge variant={roleBadgeVariant(myRole)}>{roleLabel(myRole)}</Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted dark:text-dark-muted">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {memberCountLabel(memberCount)}
            </span>
            {project.createdAt && <span>Created {formatDate(project.createdAt)}</span>}
          </div>
        </header>

        <nav aria-label="Project sections">
          <ul className="flex flex-wrap gap-1 border-b border-border dark:border-dark-border">
            {TABS.map(({ to, end, label, icon: Icon }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition
                    ${
                      isActive
                        ? 'border-primary text-primary dark:text-dark-primary'
                        : 'border-transparent text-muted hover:border-border hover:text-foreground dark:text-dark-muted dark:hover:border-dark-border dark:hover:text-dark-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Outlet />
      </div>
    </ProjectContext.Provider>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, FolderOpen, Plus, Users } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '../../components/ui/index.js';
import { consumePendingCreate, useUiStore } from '../../stores/uiStore.js';
import {
  formatDate,
  memberCountLabel,
  roleBadgeVariant,
  roleLabel,
} from '../../lib/format.js';
import { CreateProjectModal } from './CreateProjectModal.jsx';
import { useProjects } from './useProjects.js';

/**
 * P2.1 — Projects list.
 * GET /projects returns [{ role, project }] including a member count, so the
 * grid needs no follow-up requests. Loading / empty / error states all render
 * (docs/05 § P5.3). Cards link into the project shell (P2.3).
 */
export function ProjectsPage() {
  const { projects, status, error, reload, addProject } = useProjects();
  const [creating, setCreating] = useState(false);
  const pendingCreate = useUiStore((s) => s.pendingCreate);

  // ⌘K palette "Create new project" → open the modal on arrival (one-shot).
  useEffect(() => {
    if (pendingCreate && consumePendingCreate('project')) setCreating(true);
  }, [pendingCreate]);

  const count = projects.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            {status === 'ready' && count > 0
              ? `${count} project${count === 1 ? '' : 's'} you're a member of`
              : 'Projects you own or have been added to'}
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New project
        </Button>
      </header>

      {status === 'loading' && (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {[0, 1, 2].map((index) => (
            <div key={index} className="app-card p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-6 h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="app-card p-6 text-center" role="alert">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden />
          <p className="mt-3 font-medium text-foreground dark:text-dark-foreground">
            Couldn&rsquo;t load your projects
          </p>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && count === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects hold your tasks, notes and teammates. Create your first one to get started."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Create your first project
            </Button>
          }
        />
      )}

      {status === 'ready' && count > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(({ role, project }) => (
            <li key={project._id} className="app-card flex flex-col p-5 transition hover:border-primary/40 dark:hover:border-dark-primary/40">
              <Link
                to={`/projects/${project._id}`}
                className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-foreground dark:text-dark-foreground">
                    {project.name}
                  </h2>
                  <Badge variant={roleBadgeVariant(role)}>{roleLabel(role)}</Badge>
                </div>

                <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted dark:text-dark-muted">
                  {project.description || 'No description yet.'}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-muted dark:text-dark-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {memberCountLabel(project.members)}
                  </span>
                  {project.createdAt && <span>Created {formatDate(project.createdAt)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={addProject}
        />
      )}
    </div>
  );
}

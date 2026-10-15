import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
} from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '../../components/ui/index.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { consumePendingCreate, useUiStore } from '../../stores/uiStore.js';
import {
  fromNow,
  roleBadgeVariant,
  roleLabel,
} from '../../lib/format.js';
import { CreateProjectModal } from './CreateProjectModal.jsx';
import { useProjects } from './useProjects.js';

export function ProjectsPage() {
  const { projects, status, error, reload, addProject } = useProjects();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('grid');
  const [creating, setCreating] = useState(false);
  const pendingCreate = useUiStore((s) => s.pendingCreate);

  // ⌘K palette "Create new project" → open the modal on arrival (one-shot).
  useEffect(() => {
    if (pendingCreate && consumePendingCreate('project')) setCreating(true);
  }, [pendingCreate]);

  const filtered = projects.filter(({ project }) =>
    project?.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Projects"
        description="All projects in your workspace."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New project
          </Button>
        }
      />

      {/* ── Toolbar: Search & View Switcher ──────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="app-input pl-9"
            aria-label="Search projects"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`flex h-7 w-7 items-center justify-center rounded transition ${
              view === 'grid'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex h-7 w-7 items-center justify-center rounded transition ${
              view === 'list'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-label="List view"
          >
            <ListIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Loading Skeleton ────────────────────────────── */}
      {status === 'loading' && (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="app-card p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-4 h-3 w-28" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error State ─────────────────────────────────── */}
      {status === 'error' && (
        <div className="app-card p-6 text-center" role="alert">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden />
          <p className="mt-3 font-medium text-foreground">
            Couldn&rsquo;t load your projects
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────── */}
      {status === 'ready' && filtered.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={query ? 'No matching projects' : 'No projects yet'}
          description={
            query
              ? `No projects matched "${query}".`
              : 'Create your first project to organize tasks, notes, and teammates.'
          }
          action={
            query ? (
              <Button variant="outline" onClick={() => setQuery('')}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New project
              </Button>
            )
          }
        />
      )}

      {/* ── Ready: Grid View ─────────────────────────────── */}
      {status === 'ready' && filtered.length > 0 && view === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ role, project }, i) => (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/projects/${project._id}`}
                className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-[oklch(0.6_0.2_310)]/20 font-semibold text-primary">
                    {project.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  {role && (
                    <Badge variant={roleBadgeVariant(role)}>
                      {roleLabel(role)}
                    </Badge>
                  )}
                </div>

                <h3 className="mt-4 font-semibold tracking-tight text-foreground">
                  {project.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {project.members
                      ? `${project.members} member${project.members === 1 ? '' : 's'}`
                      : '1 member'}
                  </span>
                  <span>{fromNow(project.updatedAt ?? project.createdAt)}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Ready: List View ────────────────────────────── */}
      {status === 'ready' && filtered.length > 0 && view === 'list' && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ role, project }) => (
                <tr key={project._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={`/projects/${project._id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {project.name}
                    </Link>
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                      {project.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {role && (
                      <Badge variant={roleBadgeVariant(role)}>
                        {roleLabel(role)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {fromNow(project.updatedAt ?? project.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

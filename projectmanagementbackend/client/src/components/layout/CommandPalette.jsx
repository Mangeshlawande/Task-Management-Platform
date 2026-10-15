import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  StickyNote,
  Sun,
  Users,
} from 'lucide-react';
import { Modal } from '../ui/index.js';
import { useUiStore } from '../../stores/uiStore.js';
import { projectsApi } from '../../api/projects.js';
import { tasksApi } from '../../api/tasks.js';
import { useCacheStore } from '../../stores/cacheStore.js';
import { statusLabel } from '../../lib/format.js';

/**
 * ⌘K / Ctrl+K command palette (docs/07 § 2.2). Hand-rolled — no cmdk, per the
 * docs/02 stack table.
 *
 * - Open flag lives in uiStore (`paletteOpen`); the global key binding is
 *   mounted in ProtectedLayout, the trigger button in the topbar.
 * - Filter-as-you-type over a static command list; ↑/↓ move, Enter runs,
 *   Esc closes (the shared Modal owns Esc + focus trap).
 * - Create actions navigate first, then drop a one-shot `pendingCreate`
 *   intent in uiStore — the target page consumes it and opens its modal.
 *   The intent expires after 15 s so a stale one never fires later.
 *
 * Project-scoped commands only appear inside /projects/:projectId — the
 * palette itself never fetches; it reads the route.
 */

export function CommandPalette({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const open = useUiStore((s) => s.paletteOpen);
  const close = useUiStore((s) => s.closePalette);
  const setPendingCreate = useUiStore((s) => s.setPendingCreate);
  const setTheme = useUiStore((s) => s.setTheme);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Search index for global workspace deep search
  const [indexData, setIndexData] = useState({ projects: [], tasks: [] });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadIndex() {
      try {
        const cachedDashboard = useCacheStore.getState().get('workspace:dashboard');
        if (cachedDashboard?.tasks && cachedDashboard?.projectList) {
          if (!cancelled) {
            setIndexData({
              projects: cachedDashboard.projectList.map((p) => p.project || p),
              tasks: cachedDashboard.tasks,
            });
          }
          return;
        }

        const pList = await projectsApi.list().catch(() => []);
        if (cancelled) return;
        const projs = Array.isArray(pList) ? pList.map((p) => p.project || p) : [];

        const taskPromises = projs.slice(0, 10).map((p) =>
          tasksApi.list(p._id).then((ts) =>
            Array.isArray(ts) ? ts.map((t) => ({ ...t, projectName: p.name, projectId: p._id })) : []
          ).catch(() => [])
        );

        const taskArrays = await Promise.all(taskPromises);
        if (!cancelled) {
          setIndexData({
            projects: projs,
            tasks: taskArrays.flat(),
          });
        }
      } catch {
        // ignore network error
      }
    }

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // The stored theme can be 'system' — toggle the EFFECTIVE dark state, not
  // the stored value, or "Switch to dark theme" no-ops on a system-dark page.
  const isDark = document.documentElement.classList.contains('dark');

  // Current project id from the route (null outside a project).
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;

  const run = (fn) => {
    close();
    fn();
  };

  const commands = useMemo(() => {
    const list = [
      {
        id: 'workspace-dashboard',
        label: 'Go to Workspace Dashboard',
        hint: 'Navigate',
        icon: LayoutDashboard,
        keywords: 'overview stats metrics home',
        run: () => navigate('/dashboard'),
      },
      {
        id: 'projects',
        label: 'Go to Projects',
        hint: 'Navigate',
        icon: FolderOpen,
        keywords: 'home list all',
        run: () => navigate('/projects'),
      },
      {
        id: 'workspace-notes',
        label: 'Go to Workspace Notes',
        hint: 'Navigate',
        icon: StickyNote,
        keywords: 'docs memos documentation write',
        run: () => navigate('/notes'),
      },
      {
        id: 'workspace-members',
        label: 'Go to Team Members',
        hint: 'Navigate',
        icon: Users,
        keywords: 'people directory colleagues team',
        run: () => navigate('/members'),
      },
      {
        id: 'profile',
        label: 'Go to Profile',
        hint: 'Navigate',
        icon: Settings,
        keywords: 'profile account me avatar bio',
        run: () => navigate('/profile'),
      },
      {
        id: 'settings',
        label: 'Go to Settings',
        hint: 'Navigate',
        icon: Settings,
        keywords: 'password credentials security',
        run: () => navigate('/settings'),
      },
      {
        id: 'new-project',
        label: 'Create new project',
        hint: 'Create',
        icon: Plus,
        keywords: 'add make start',
        run: () => {
          navigate('/projects');
          setPendingCreate({ kind: 'project', ts: Date.now() });
        },
      },
      {
        id: 'theme',
        label: isDark ? 'Switch to light theme' : 'Switch to dark theme',
        hint: 'Preferences',
        icon: isDark ? Sun : Moon,
        keywords: 'dark light mode appearance',
        run: () => setTheme(isDark ? 'light' : 'dark'),
      },
      {
        id: 'logout',
        label: 'Log out',
        hint: 'Session',
        icon: LogOut,
        keywords: 'sign out exit',
        run: () => onLogout?.(),
      },
    ];

    if (projectId) {
      list.splice(
        1,
        0,
        {
          id: 'dashboard',
          label: 'Go to Dashboard',
          hint: 'Project',
          icon: LayoutDashboard,
          keywords: 'overview stats',
          run: () => navigate(`/projects/${projectId}`),
        },
        {
          id: 'board',
          label: 'Go to Board',
          hint: 'Project',
          icon: KanbanSquare,
          keywords: 'kanban board tasks pipeline columns workflow',
          run: () => navigate(`/projects/${projectId}/board`),
        },
        {
          id: 'discussions',
          label: 'Go to Comments & Views',
          hint: 'Project',
          icon: MessageSquare,
          keywords: 'discussions viewpoints opinions comments ideas blockers views feedback',
          run: () => navigate(`/projects/${projectId}/discussions`),
        },
        {
          id: 'notes',
          label: 'Go to Notes',
          hint: 'Project',
          icon: StickyNote,
          keywords: 'memos pinned',
          run: () => navigate(`/projects/${projectId}/notes`),
        },
        {
          id: 'members',
          label: 'Go to Members',
          hint: 'Project',
          icon: Users,
          keywords: 'people teammates roles',
          run: () => navigate(`/projects/${projectId}/members`),
        },
        {
          id: 'project-settings',
          label: 'Go to Project Settings',
          hint: 'Project',
          icon: Settings,
          keywords: 'rename danger zone delete',
          run: () => navigate(`/projects/${projectId}/settings`),
        },
        {
          id: 'new-task',
          label: 'Create task',
          hint: 'Create',
          icon: Plus,
          keywords: 'add task board pipeline card',
          run: () => {
            navigate(`/projects/${projectId}/tasks`);
            setPendingCreate({ kind: 'task', projectId, ts: Date.now() });
          },
        },
        {
          id: 'new-note',
          label: 'Write note',
          hint: 'Create',
          icon: StickyNote,
          keywords: 'add memo create',
          run: () => {
            navigate(`/projects/${projectId}/notes`);
            setPendingCreate({ kind: 'note', projectId, ts: Date.now() });
          },
        },
      );
    }

    return list;
  }, [projectId, isDark, navigate, setTheme, setPendingCreate, onLogout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;

    const matchedCommands = commands.filter((c) =>
      `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(q)
    );

    // Deep search across projects
    const matchedProjects = (indexData.projects || [])
      .filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: `proj-${p._id}`,
        label: p.name,
        hint: 'Project',
        icon: FolderOpen,
        run: () => navigate(`/projects/${p._id}`),
      }));

    // Deep search across tasks
    const matchedTasks = (indexData.tasks || [])
      .filter((t) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        id: `task-${t._id}`,
        label: t.title,
        hint: `${t.projectName || 'Task'} · ${statusLabel(t.status)}`,
        icon: KanbanSquare,
        run: () => navigate(`/projects/${t.projectId}/board`),
      }));

    return [...matchedCommands, ...matchedProjects, ...matchedTasks];
  }, [commands, query, indexData, navigate]);

  // Reset selection whenever the result set changes.
  useEffect(() => {
    setActive(0);
  }, [query, projectId, isDark]);

  // Fresh open → clear the query (state persists across close via Modal unmount? no —
  // the palette unmounts when closed, so this is belt-and-braces).
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = filtered[active];
      if (cmd) run(cmd.run);
    }
  };

  return (
    <Modal onClose={close} title="Command palette">
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            ref={inputRef}
            data-autofocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-label="Search commands"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            placeholder="Type a command…"
            autoComplete="off"
            className="app-input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted dark:text-dark-muted">
            No commands match “{query}”.
          </p>
        ) : (
          <ul
            id="command-palette-list"
            role="listbox"
            aria-label="Commands"
            className="max-h-72 overflow-y-auto"
          >
            {filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              const isActive = index === active;
              return (
                <li key={cmd.id} id={`cmd-${cmd.id}`} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    // The input keeps focus (it owns ↑/↓/Enter); the button is
                    // only a mouse target, so it must not steal focus on click.
                    tabIndex={-1}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(cmd.run)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition
                      ${
                        isActive
                          ? 'bg-primary/10 text-primary dark:text-dark-primary'
                          : 'text-foreground hover:bg-surface-alt dark:text-dark-foreground dark:hover:bg-dark-surface-alt'
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{cmd.label}</span>
                    <span className="text-xs text-muted dark:text-dark-muted">{cmd.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="border-t border-border pt-3 text-xs text-muted dark:border-dark-border dark:text-dark-muted">
          <kbd className="rounded border border-border px-1 dark:border-dark-border">↑</kbd>{' '}
          <kbd className="rounded border border-border px-1 dark:border-dark-border">↓</kbd> to
          navigate ·{' '}
          <kbd className="rounded border border-border px-1 dark:border-dark-border">↵</kbd> to
          run ·{' '}
          <kbd className="rounded border border-border px-1 dark:border-dark-border">Esc</kbd> to
          close
        </p>
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Inbox, Paperclip, Plus, RefreshCw, Search } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Skeleton,
} from '../../components/ui/index.js';
import {
  canManageContent,
  formatDate,
  priorityBadgeVariant,
  statusLabel,
} from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import { toast, useUiStore, consumePendingCreate } from '../../stores/uiStore.js';
import { useBoardTasks } from './useBoardTasks.js';
import { TaskCreateModal } from './TaskCreateModal.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';

const COLUMNS = [
  { status: 'todo', label: 'To do', dot: 'bg-slate-400 dark:bg-slate-500' },
  { status: 'in_progress', label: 'In progress', dot: 'bg-primary' },
  { status: 'done', label: 'Done', dot: 'bg-success' },
];

/**
 * P3 — Kanban board (docs/05 P3).
 * - Three columns from `GET /projects/:id/tasks` grouped by status
 * - Optimistic moves: native HTML5 drag & drop between columns AND a status
 *   <select> on every card (keyboard/mobile path) — no drag-and-drop library
 * - Create / detail modals, search + assignee + priority filters
 * - Role gates: only admin/project_admin (or a task's creator) can move or
 *   create; everyone can open tasks and tick subtasks.
 */
export function BoardPage() {
  const { project, members, myRole } = useProject();
  const currentUserId = useAuthStore((s) => s.user?._id);
  const board = useBoardTasks(project._id);

  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState('all');
  const [priority, setPriority] = useState('all');
  const [creating, setCreating] = useState(false);
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const canCreate = canManageContent(myRole);

  // ⌘K palette "Create task" → open the modal on arrival (one-shot). Role-gated
  // so a plain member never sees a modal their role can't submit (docs/05 DoD).
  useEffect(() => {
    if (pendingCreate && consumePendingCreate('task') && canCreate) setCreating(true);
  }, [pendingCreate, canCreate]);
  const canMove = (task) =>
    canManageContent(myRole) || task.assignedBy?._id === currentUserId;

  const filtersActive = query.trim() !== '' || assignee !== 'all' || priority !== 'all';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.tasks.filter((task) => {
      if (q && !task.title.toLowerCase().includes(q)) return false;
      if (assignee === 'none' && task.assignedTo) return false;
      if (assignee !== 'all' && assignee !== 'none' && task.assignedTo?._id !== assignee) {
        return false;
      }
      if (priority !== 'all' && task.priority !== priority) return false;
      return true;
    });
  }, [board.tasks, query, assignee, priority]);

  const byStatus = useMemo(() => {
    const groups = { todo: [], in_progress: [], done: [] };
    filtered.forEach((task) => {
      (groups[task.status] ??= []).push(task);
    });
    return groups;
  }, [filtered]);

  const openTask = board.tasks.find((task) => task._id === openTaskId) ?? null;

  const handleMove = async (task, status) => {
    try {
      await board.moveTask(task, status);
    } catch (err) {
      toast.error(err?.message || 'Could not move this task.');
    }
  };

  const handleDrop = (event, status) => {
    event.preventDefault();
    setDragOver(null);
    const taskId = event.dataTransfer.getData('text/plain');
    const task = board.tasks.find((t) => t._id === taskId);
    if (task && canMove(task) && task.status !== status) {
      handleMove(task, status);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setAssignee('all');
    setPriority('all');
  };

  /* ------------------------------------------------------------- states */

  if (board.status === 'loading') {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading board">
        {COLUMNS.map((column) => (
          <div key={column.status} className="app-card p-4">
            <Skeleton className="h-5 w-24" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (board.status === 'error') {
    return (
      <div className="app-card p-6 text-center" role="alert">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden />
        <p className="mt-3 font-medium text-foreground dark:text-dark-foreground">
          Couldn&rsquo;t load the board
        </p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">{board.error}</p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={board.reload}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted dark:text-dark-muted"
          aria-hidden
        />
        <input
          type="search"
          className="app-input pl-9"
          placeholder="Search tasks…"
          aria-label="Search tasks by title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <select
        className="app-input w-44"
        aria-label="Filter by assignee"
        value={assignee}
        onChange={(event) => setAssignee(event.target.value)}
      >
        <option value="all">All assignees</option>
        <option value="none">Unassigned</option>
        {members.map((member) => (
          <option key={member.user._id} value={member.user._id}>
            {member.user.fullName || member.user.username}
          </option>
        ))}
      </select>

      <select
        className="app-input w-36"
        aria-label="Filter by priority"
        value={priority}
        onChange={(event) => setPriority(event.target.value)}
      >
        <option value="all">All priorities</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear
        </Button>
      )}

      {canCreate && (
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New task
        </Button>
      )}
    </div>
  );

  /* Empty project — full-width empty state with the next action (docs/05 P5.3) */
  if (board.tasks.length === 0) {
    return (
      <div className="space-y-4">
        {toolbar}
        <EmptyState
          icon={Inbox}
          title="No tasks yet"
          description={
            canCreate
              ? 'Create the first task to get this board moving.'
              : 'No tasks here yet — a project admin will add the first one.'
          }
          action={
            canCreate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Create the first task
              </Button>
            ) : undefined
          }
        />
        {creating && (
          <TaskCreateModal
            onClose={() => setCreating(false)}
            onCreate={board.createTask}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}

      {filtered.length === 0 ? (
        <div className="app-card p-6 text-center">
          <p className="text-sm text-muted dark:text-dark-muted">
            No tasks match your filters.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const items = byStatus[column.status] ?? [];
            const isTarget = dragOver === column.status;

            return (
              <section
                key={column.status}
                aria-label={`${column.label} column`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(column.status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragOver(null);
                  }
                }}
                onDrop={(event) => handleDrop(event, column.status)}
                className={`app-card flex flex-col p-3 transition
                  ${isTarget ? 'ring-2 ring-primary/60' : ''}`}
              >
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} aria-hidden />
                  <h2 className="text-sm font-semibold text-foreground dark:text-dark-foreground">
                    {column.label}
                  </h2>
                  <span className="ml-auto rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted dark:bg-dark-surface-alt dark:text-dark-muted">
                    {items.length}
                  </span>
                </header>

                <ul className="min-h-[6rem] flex-1 space-y-3">
                  {items.length === 0 && (
                    <li className="px-1 py-6 text-center text-xs text-muted dark:text-dark-muted">
                      No tasks
                    </li>
                  )}

                  {items.map((task) => {
                    const editable = canMove(task);
                    const overdue =
                      task.dueDate &&
                      task.status !== 'done' &&
                      new Date(task.dueDate) < new Date();

                    return (
                      <li
                        key={task._id}
                        draggable={editable}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', task._id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDragOver(null)}
                        className={`cursor-grab rounded-lg border border-border bg-card p-3
                          transition hover:border-primary/40 hover:shadow-sm active:cursor-grabbing
                          dark:border-dark-border dark:bg-dark-card
                          ${dragOver && task.status !== column.status ? 'opacity-60' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenTaskId(task._id)}
                          className="block w-full text-left"
                        >
                          <span className="block text-sm font-medium leading-snug text-foreground line-clamp-2 dark:text-dark-foreground">
                            {task.title}
                          </span>
                        </button>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={priorityBadgeVariant(task.priority)}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] ${
                                overdue
                                  ? 'text-danger'
                                  : 'text-muted dark:text-dark-muted'
                              }`}
                            >
                              {formatDate(task.dueDate)}
                              {overdue && ' · overdue'}
                            </span>
                          )}
                          {task.attachments?.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[11px] text-muted dark:text-dark-muted"
                              title={`${task.attachments.length} attachment(s)`}
                            >
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {task.attachments.length}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted dark:text-dark-muted">
                            {task.assignedTo ? (
                              <>
                                <Avatar user={task.assignedTo} size="sm" />
                                <span className="truncate">
                                  {task.assignedTo.fullName || task.assignedTo.username}
                                </span>
                              </>
                            ) : (
                              'Unassigned'
                            )}
                          </span>

                          {editable && (
                            <select
                              aria-label={`Move “${task.title}” to another column`}
                              className="app-input h-7 w-28 shrink-0 py-0 text-xs"
                              value={task.status}
                              onChange={(event) => handleMove(task, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {COLUMNS.map((option) => (
                                <option key={option.status} value={option.status}>
                                  {statusLabel(option.status)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {creating && (
        <TaskCreateModal
          onClose={() => setCreating(false)}
          onCreate={board.createTask}
        />
      )}

      {openTask && (
        <TaskDetailModal
          key={openTask._id}
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onSaved={board.patchTask}
          onDeleted={board.removeTask}
        />
      )}
    </div>
  );
}

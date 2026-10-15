import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Inbox,
  KanbanSquare,
  List as ListIcon,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
} from '../../components/ui/index.js';
import {
  canManageContent,
  formatDate,
  getDueDateStatus,
  priorityBadgeVariant,
  statusLabel,
} from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import { toast, useUiStore, consumePendingCreate } from '../../stores/uiStore.js';
import { useBoardTasks } from './useBoardTasks.js';
import { TaskCreateModal } from './TaskCreateModal.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';
import { tasksApi } from '../../api/tasks.js';
import { exportTasksToCSV } from '../../lib/exportService.js';

const COLUMNS = [
  { status: 'todo', label: 'To Do', dot: 'bg-slate-400 dark:bg-slate-500' },
  { status: 'in_progress', label: 'In Progress', dot: 'bg-primary' },
  { status: 'done', label: 'Done', dot: 'bg-success' },
];

function TaskCardInner({ task, editable, overdue, onOpen, onMove, isOverlay = false }) {
  const dueStatus = getDueDateStatus(task.dueDate, task.status);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
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
        {dueStatus && (
          dueStatus.isOverdue ? (
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              title={`Overdue: deadline was ${formatDate(task.dueDate)}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {dueStatus.label}
            </span>
          ) : dueStatus.isDueToday ? (
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              title="Due today"
            >
              <Clock className="h-3 w-3" />
              Due today
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted dark:text-dark-muted">
              <Calendar className="h-3 w-3" />
              {dueStatus.label}
            </span>
          )
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
        <span className="inline-flex min-w-0 items-center text-xs text-muted dark:text-dark-muted">
          {task.assignedTo ? (
            <span className="truncate">
              {task.assignedTo.fullName || task.assignedTo.username}
            </span>
          ) : (
            'Unassigned'
          )}
        </span>

        {editable && !isOverlay && (
          <select
            aria-label={`Move “${task.title}” to another column`}
            className="app-input h-7 w-28 shrink-0 py-0 text-xs"
            value={task.status}
            onChange={(event) => onMove(task, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {COLUMNS.map((option) => (
              <option key={option.status} value={option.status}>
                {statusLabel(option.status)}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}

function DraggableTaskCard({ task, editable, overdue, dragOverStatus, onOpen, onMove }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task._id,
    disabled: !editable,
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      draggable={editable}
      onDragStart={(event) => {
        event.dataTransfer?.setData('text/plain', task._id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-lg border border-border bg-card p-3 transition
        hover:border-primary/40 hover:shadow-sm
        dark:border-dark-border dark:bg-dark-card
        ${editable ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
        ${isDragging ? 'opacity-30' : ''}
        ${dragOverStatus && task.status !== dragOverStatus ? 'opacity-60' : ''}`}
    >
      <TaskCardInner
        task={task}
        editable={editable}
        overdue={overdue}
        onOpen={onOpen}
        onMove={onMove}
      />
    </li>
  );
}

function DroppableColumn({
  column,
  items,
  isTarget,
  onNativeDragOver,
  onNativeDragLeave,
  onNativeDrop,
  children,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label} column`}
      onDragOver={onNativeDragOver}
      onDragLeave={onNativeDragLeave}
      onDrop={onNativeDrop}
      className={`app-card flex flex-col p-3 transition
        ${isTarget || isOver ? 'ring-2 ring-primary/60 bg-primary/5 dark:bg-primary/10' : ''}`}
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
        {items.length === 0 ? (
          <li className="px-1 py-6 text-center text-xs text-muted dark:text-dark-muted">
            No tasks
          </li>
        ) : (
          children
        )}
      </ul>
    </section>
  );
}


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
  const { project, members, tasks: projectTasks, myRole } = useProject();
  const currentUserId = useAuthStore((s) => s.user?._id);
  const board = useBoardTasks(project._id, projectTasks);

  const [query, setQuery] = useState('');
  const [view, setView] = useState('board');
  const [assignee, setAssignee] = useState('all');
  const [priority, setPriority] = useState('all');
  const [creating, setCreating] = useState(false);
  const pendingCreate = useUiStore((s) => s.pendingCreate);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Batch task selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.size === filtered.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filtered.map((t) => t._id)));
    }
  };

  const handleToggleTask = (taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBatchMove = async (newStatus) => {
    if (selectedTaskIds.size === 0 || batchBusy) return;
    setBatchBusy(true);
    try {
      const targetTasks = board.tasks.filter((t) => selectedTaskIds.has(t._id));
      await Promise.all(
        targetTasks.map((t) => board.moveTask(t, newStatus))
      );
      toast.success(`Moved ${targetTasks.length} task(s) to ${statusLabel(newStatus)}.`);
      setSelectedTaskIds(new Set());
    } catch (err) {
      toast.error(err?.message || 'Could not move all selected tasks.');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchPriority = async (newPriority) => {
    if (selectedTaskIds.size === 0 || batchBusy) return;
    setBatchBusy(true);
    try {
      const ids = Array.from(selectedTaskIds);
      await Promise.all(
        ids.map((id) => tasksApi.update(project._id, id, { priority: newPriority }))
      );
      toast.success(`Set ${ids.length} task(s) to ${newPriority} priority.`);
      board.reload(true);
      setSelectedTaskIds(new Set());
    } catch (err) {
      toast.error(err?.message || 'Could not update priority for all selected tasks.');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTaskIds.size === 0 || batchBusy) return;
    if (!window.confirm(`Delete ${selectedTaskIds.size} selected task(s)? This cannot be undone.`)) return;
    setBatchBusy(true);
    try {
      const ids = Array.from(selectedTaskIds);
      await Promise.all(
        ids.map(async (id) => {
          await tasksApi.remove(project._id, id);
          board.removeTask(id);
        })
      );
      toast.success(`Deleted ${ids.length} task(s).`);
      setSelectedTaskIds(new Set());
    } catch (err) {
      toast.error(err?.message || 'Could not delete all selected tasks.');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleDndDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id;
    const task = board.tasks.find((t) => t._id === active.id);
    if (task && canMove(task) && task.status !== newStatus) {
      handleMove(task, newStatus);
    }
  };

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

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        <button
          type="button"
          onClick={() => setView('board')}
          className={`flex h-7 w-7 items-center justify-center rounded transition ${
            view === 'board'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          aria-label="Board view"
        >
          <KanbanSquare className="h-3.5 w-3.5" />
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

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          exportTasksToCSV(board.tasks || [], project?.name || 'project');
          toast.success('Tasks exported to CSV.');
        }}
        className="gap-1.5"
        title="Export tasks to CSV"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export CSV</span>
      </Button>

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
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedTaskIds.size === filtered.length}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                    aria-label="Select all tasks"
                  />
                </th>
                <th className="px-5 py-3 font-medium">Task</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const isSelected = selectedTaskIds.has(t._id);
                return (
                  <tr
                    key={t._id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setOpenTaskId(t._id)}
                  >
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTask(t._id)}
                        className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                        aria-label={`Select task ${t.title}`}
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {t.title}
                      {t.description && (
                        <div className="line-clamp-1 text-xs font-normal text-muted-foreground">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline">{statusLabel(t.status)}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={priorityBadgeVariant(t.priority)}>{t.priority}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {t.assignedTo ? (
                      <span className="text-xs text-foreground truncate">
                        {t.assignedTo.fullName || t.assignedTo.username}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {t.dueDate ? (() => {
                      const dueStatus = getDueDateStatus(t.dueDate, t.status);
                      if (!dueStatus) return '—';
                      if (dueStatus.isOverdue) {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            {dueStatus.label}
                          </span>
                        );
                      }
                      if (dueStatus.isDueToday) {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Due today
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(t.dueDate)}
                        </span>
                      );
                    })() : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event) => {
            const task = board.tasks.find((t) => t._id === event.active.id);
            setActiveTask(task || null);
          }}
          onDragEnd={handleDndDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => {
              const items = byStatus[column.status] ?? [];
              const isTarget = dragOver === column.status;

              return (
                <DroppableColumn
                  key={column.status}
                  column={column}
                  items={items}
                  isTarget={isTarget}
                  onNativeDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(column.status);
                  }}
                  onNativeDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setDragOver(null);
                    }
                  }}
                  onNativeDrop={(event) => handleDrop(event, column.status)}
                >
                  {items.map((task) => {
                    const editable = canMove(task);
                    const overdue =
                      task.dueDate &&
                      task.status !== 'done' &&
                      new Date(task.dueDate) < new Date();

                    return (
                      <DraggableTaskCard
                        key={task._id}
                        task={task}
                        editable={editable}
                        overdue={overdue}
                        dragOverStatus={dragOver}
                        onOpen={() => setOpenTaskId(task._id)}
                        onMove={handleMove}
                      />
                    );
                  })}
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 cursor-grabbing opacity-90">
                <div className="rounded-lg border border-border bg-card p-3 shadow-xl dark:border-dark-border dark:bg-dark-card">
                  <TaskCardInner
                    task={activeTask}
                    editable={false}
                    overdue={false}
                    onOpen={() => {}}
                    onMove={() => {}}
                    isOverlay={true}
                  />
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Floating Batch Action Toolbar */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md dark:border-dark-border dark:bg-dark-card/95">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {selectedTaskIds.size}
            </span>
            <span>selected</span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Batch Status Move */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground hidden sm:inline mr-1">Move:</span>
            {COLUMNS.map((col) => (
              <button
                key={col.status}
                type="button"
                disabled={batchBusy}
                onClick={() => handleBatchMove(col.status)}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition disabled:opacity-50"
              >
                {col.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Batch Priority */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="text-muted-foreground mr-1">Priority:</span>
            {['HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                type="button"
                disabled={batchBusy}
                onClick={() => handleBatchPriority(p)}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition disabled:opacity-50"
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {canManageContent(myRole) && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                disabled={batchBusy}
                onClick={handleBatchDelete}
                className="h-7 text-xs text-danger hover:bg-danger/10 gap-1 px-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTaskIds(new Set())}
            className="h-7 text-xs text-muted-foreground px-2"
          >
            Cancel
          </Button>
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

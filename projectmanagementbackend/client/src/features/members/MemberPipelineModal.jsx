import { useState, useMemo } from 'react';
import {
  GitBranch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderOpen,
  User,
  ArrowRight,
  Search,
  CheckCircle,
  Calendar,
  CircleDot,
  ArrowUpRight,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Modal,
} from '../../components/ui/index.js';
import {
  formatDate,
  fromNow,
  priorityBadgeVariant,
  roleBadgeVariant,
  roleLabel,
  statusLabel,
} from '../../lib/format.js';

/**
 * MemberPipelineModal
 *
 * Detailed view of a team member's profile, project memberships, and their
 * assigned tasks displayed as a pipeline with dependency flow tracking
 * (which task depends on what, assignment lineage: assignedBy -> assignedTo,
 * blocker status, downstream unlocks).
 */
export function MemberPipelineModal({
  open,
  onClose,
  memberEntry,
  allTasks = [],
  projects = [],
  currentProjectId = null,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const user = memberEntry?.user || memberEntry || {};
  const userId = String(user._id || user.id || '');

  // Resolve member's project memberships
  const memberProjects = useMemo(() => {
    if (memberEntry?.projects && Array.isArray(memberEntry.projects)) {
      return memberEntry.projects;
    }
    // If not on memberEntry, fall back to checking which projects contain this user
    return projects.map((p) => ({
      id: p._id,
      name: p.name,
      role: memberEntry?.roles?.[p._id] || 'member',
    }));
  }, [memberEntry, projects]);

  // Filter tasks assigned to this member
  const memberTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const assignedId = String(t.assignedTo?._id || t.assignedTo || '');
      return assignedId === userId;
    });
  }, [allTasks, userId]);

  // Map of all tasks by ID for quick lookup of dependencies and downstream items
  const taskById = useMemo(() => {
    const map = new Map();
    allTasks.forEach((t) => {
      if (t._id) map.set(String(t._id), t);
    });
    return map;
  }, [allTasks]);

  // Downstream dependents: which tasks depend on a given task ID?
  const downstreamMap = useMemo(() => {
    const map = new Map();
    allTasks.forEach((t) => {
      const deps = t.dependsOn || [];
      deps.forEach((dep) => {
        const depId = String(dep._id || dep);
        if (!map.has(depId)) {
          map.set(depId, []);
        }
        map.get(depId).push(t);
      });
    });
    return map;
  }, [allTasks]);

  // Filtered tasks by project, search, and status
  const visibleTasks = useMemo(() => {
    return memberTasks.filter((t) => {
      const tProjId = String(t.project?._id || t.project || '');
      if (selectedProjectId !== 'all' && tProjId !== selectedProjectId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'blocked') {
          // Task has at least one prerequisite that is NOT done
          const deps = (t.dependsOn || []).map((d) => {
            const id = String(d._id || d);
            return taskById.get(id) || d;
          });
          const hasUnfinished = deps.some((d) => d.status !== 'done');
          return hasUnfinished && t.status !== 'done';
        }
        if (t.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [memberTasks, selectedProjectId, searchQuery, statusFilter, taskById]);

  // Compute stats
  const stats = useMemo(() => {
    const relevant = memberTasks.filter((t) => {
      const tProjId = String(t.project?._id || t.project || '');
      return selectedProjectId === 'all' || tProjId === selectedProjectId;
    });

    const total = relevant.length;
    const todo = relevant.filter((t) => t.status === 'todo').length;
    const inProgress = relevant.filter((t) => t.status === 'in_progress').length;
    const done = relevant.filter((t) => t.status === 'done').length;

    // Blocked tasks
    const blocked = relevant.filter((t) => {
      if (t.status === 'done') return false;
      const deps = (t.dependsOn || []).map((d) => {
        const id = String(d._id || d);
        return taskById.get(id) || d;
      });
      return deps.some((d) => d.status !== 'done');
    }).length;

    return { total, todo, inProgress, done, blocked };
  }, [memberTasks, selectedProjectId, taskById]);

  // Group tasks by pipeline stages
  const pipelineGroups = useMemo(() => {
    return {
      todo: visibleTasks.filter((t) => t.status === 'todo'),
      in_progress: visibleTasks.filter((t) => t.status === 'in_progress'),
      done: visibleTasks.filter((t) => t.status === 'done'),
    };
  }, [visibleTasks]);

  // Role info
  const roles = memberEntry?.roles ? Object.values(memberEntry.roles) : [];
  const primaryRole = roles.includes('admin')
    ? 'admin'
    : roles.includes('project_admin')
    ? 'project_admin'
    : user.role || 'member';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Member Pipeline & Task Traceability"
      description="View assigned tasks, dependency prerequisites, and pipeline execution flow."
      size="2xl"
    >
      <div className="space-y-6">
        {/* ── Member Header Profile Banner ──────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-surface-alt/70 via-surface to-surface-alt/40 p-4 sm:p-5 shadow-sm dark:border-dark-border dark:from-dark-surface-alt/60 dark:via-dark-card dark:to-dark-surface-alt/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar user={user} size="lg" className="h-14 w-14 ring-2 ring-primary/20" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground dark:text-dark-foreground">
                    {user.fullName || user.username || 'Team Member'}
                  </h3>
                  <Badge variant={roleBadgeVariant(primaryRole)} size="sm">
                    {roleLabel(primaryRole)}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted dark:text-dark-muted">
                  @{user.username} · {user.email}
                </div>
                {memberEntry?.createdAt && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted dark:text-dark-muted">
                    <User className="h-3 w-3" />
                    <span>Joined {fromNow(memberEntry.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Member's Project Tags */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Active Projects ({memberProjects.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {memberProjects.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground dark:border-dark-border dark:bg-dark-surface dark:text-dark-foreground shadow-2xs"
                  >
                    <FolderOpen className="h-3 w-3 text-primary" />
                    <span>{p.name}</span>
                  </span>
                ))}
                {memberProjects.length === 0 && (
                  <span className="text-xs text-muted dark:text-dark-muted">No projects assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* KPI Pipeline Ribbon */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div
              onClick={() => setStatusFilter('all')}
              className={`cursor-pointer rounded-lg border p-2.5 transition text-center ${
                statusFilter === 'all'
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/80 bg-surface/80 hover:bg-surface-alt dark:border-dark-border dark:bg-dark-surface/60'
              }`}
            >
              <div className="text-xs font-medium text-muted dark:text-dark-muted">Total Tasks</div>
              <div className="mt-0.5 text-xl font-bold text-foreground dark:text-dark-foreground">
                {stats.total}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('todo')}
              className={`cursor-pointer rounded-lg border p-2.5 transition text-center ${
                statusFilter === 'todo'
                  ? 'border-neutral-500 bg-neutral-500/10 shadow-sm'
                  : 'border-border/80 bg-surface/80 hover:bg-surface-alt dark:border-dark-border dark:bg-dark-surface/60'
              }`}
            >
              <div className="text-xs font-medium text-muted dark:text-dark-muted">To Do</div>
              <div className="mt-0.5 text-xl font-bold text-foreground dark:text-dark-foreground">
                {stats.todo}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('in_progress')}
              className={`cursor-pointer rounded-lg border p-2.5 transition text-center ${
                statusFilter === 'in_progress'
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/80 bg-surface/80 hover:bg-surface-alt dark:border-dark-border dark:bg-dark-surface/60'
              }`}
            >
              <div className="text-xs font-medium text-primary">In Progress</div>
              <div className="mt-0.5 text-xl font-bold text-primary">
                {stats.inProgress}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('done')}
              className={`cursor-pointer rounded-lg border p-2.5 transition text-center ${
                statusFilter === 'done'
                  ? 'border-success bg-success/10 shadow-sm'
                  : 'border-border/80 bg-surface/80 hover:bg-surface-alt dark:border-dark-border dark:bg-dark-surface/60'
              }`}
            >
              <div className="text-xs font-medium text-success">Done</div>
              <div className="mt-0.5 text-xl font-bold text-success">
                {stats.done}
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('blocked')}
              className={`cursor-pointer rounded-lg border p-2.5 transition text-center ${
                statusFilter === 'blocked'
                  ? 'border-warning bg-warning/10 shadow-sm'
                  : 'border-border/80 bg-surface/80 hover:bg-surface-alt dark:border-dark-border dark:bg-dark-surface/60'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span>Blocked</span>
              </div>
              <div className="mt-0.5 text-xl font-bold text-warning">
                {stats.blocked}
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Toolbar ──────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted dark:text-dark-muted" />
            <input
              type="text"
              placeholder="Search tasks or prerequisites…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground dark:placeholder-dark-muted"
            />
          </div>

          <div className="flex items-center gap-2">
            {memberProjects.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="member-modal-proj-filter" className="text-xs text-muted dark:text-dark-muted">
                  Project:
                </label>
                <select
                  id="member-modal-proj-filter"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="rounded-lg border border-border bg-surface-alt px-2.5 py-1 text-xs font-medium text-foreground transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground"
                >
                  <option value="all">All Projects</option>
                  {memberProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {statusFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="text-xs h-7 px-2"
              >
                Clear filter ({statusFilter})
              </Button>
            )}
          </div>
        </div>

        {/* ── 3-Stage Pipeline Board ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: To Do */}
          <PipelineColumn
            title="To Do"
            count={pipelineGroups.todo.length}
            accentColor="border-neutral-500/40"
            badgeBg="bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
            tasks={pipelineGroups.todo}
            taskById={taskById}
            downstreamMap={downstreamMap}
            emptyMessage="No pending tasks in backlog."
          />

          {/* Column 2: In Progress */}
          <PipelineColumn
            title="In Progress"
            count={pipelineGroups.in_progress.length}
            accentColor="border-primary/40"
            badgeBg="bg-primary/10 text-primary"
            tasks={pipelineGroups.in_progress}
            taskById={taskById}
            downstreamMap={downstreamMap}
            emptyMessage="No active tasks in progress."
          />

          {/* Column 3: Done */}
          <PipelineColumn
            title="Done"
            count={pipelineGroups.done.length}
            accentColor="border-success/40"
            badgeBg="bg-success/10 text-success"
            tasks={pipelineGroups.done}
            taskById={taskById}
            downstreamMap={downstreamMap}
            emptyMessage="No completed tasks yet."
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * Pipeline Column for each workflow stage
 */
function PipelineColumn({
  title,
  count,
  accentColor,
  badgeBg,
  tasks,
  taskById,
  downstreamMap,
  emptyMessage,
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-alt/40 dark:border-dark-border dark:bg-dark-surface-alt/30 p-3 min-h-[300px]">
      {/* Column Header */}
      <div className={`flex items-center justify-between border-b pb-2 mb-3 ${accentColor}`}>
        <div className="flex items-center gap-2">
          <CircleDot className="h-3.5 w-3.5 text-muted dark:text-dark-muted" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-dark-foreground">
            {title}
          </h4>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeBg}`}>
          {count}
        </span>
      </div>

      {/* Cards container */}
      <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
        {tasks.map((task) => (
          <PipelineTaskCard
            key={task._id}
            task={task}
            taskById={taskById}
            downstreamMap={downstreamMap}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-xs text-muted dark:text-dark-muted italic">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Task Pipeline Card
 * Displays:
 *  - Title, priority, due date
 *  - Assigned By → Assigned To lineage
 *  - Pipeline dependencies (Blocked by / Prerequisite complete)
 *  - Downstream dependents (Unlocks / Prerequisite for)
 */
function PipelineTaskCard({ task, taskById, downstreamMap }) {
  // Resolve dependsOn objects
  const rawDependsOn = task.dependsOn || [];
  const dependencies = rawDependsOn.map((d) => {
    const id = String(d._id || d);
    const lookedUp = taskById.get(id);
    return lookedUp || d;
  });

  const hasDependencies = dependencies.length > 0;
  const unfinishedDependencies = dependencies.filter((d) => d.status !== 'done');
  const isBlocked = hasDependencies && unfinishedDependencies.length > 0 && task.status !== 'done';
  const allPrereqsDone = hasDependencies && unfinishedDependencies.length === 0;

  // Resolve downstream tasks (tasks that depend on this task)
  const downstreamTasks = downstreamMap.get(String(task._id)) || [];

  // Assignment metadata
  const assignedBy = task.assignedBy;
  const assignedTo = task.assignedTo;

  return (
    <div
      className={`rounded-lg border bg-card p-3.5 shadow-sm transition hover:shadow-md dark:bg-dark-card ${
        isBlocked
          ? 'border-warning/60 ring-1 ring-warning/20'
          : allPrereqsDone
          ? 'border-success/50'
          : 'border-border dark:border-dark-border'
      }`}
    >
      {/* Priority & Due Date Header */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant={priorityBadgeVariant(task.priority)} size="sm">
          {task.priority || 'MEDIUM'}
        </Badge>

        {task.dueDate && (
          <span className="flex items-center gap-1 text-[11px] text-muted dark:text-dark-muted font-medium">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </span>
        )}
      </div>

      {/* Title */}
      <h5 className="mt-2 text-sm font-semibold text-foreground dark:text-dark-foreground line-clamp-2">
        {task.title}
      </h5>

      {/* Description preview */}
      {task.description && (
        <p className="mt-1 text-xs text-muted dark:text-dark-muted line-clamp-2">
          {task.description}
        </p>
      )}

      {/* ── Assignment Lineage: Who assigned to whom ──────────────────────── */}
      <div className="mt-3 rounded-md bg-surface-alt/70 p-2 dark:bg-dark-surface-alt/60 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted dark:text-dark-muted">
          <span className="font-medium text-foreground dark:text-dark-foreground">
            From: @{assignedBy?.username || assignedBy?.fullName || 'admin'}
          </span>
          <ArrowRight className="h-3 w-3 text-muted shrink-0" />
          <span className="font-semibold text-primary">
            To: @{assignedTo?.username || assignedTo?.fullName || 'teammate'}
          </span>
        </div>
      </div>

      {/* ── Pipeline Dependency Tracker ──────────────────────── */}
      {hasDependencies && (
        <div className="mt-2.5 rounded-md border border-border/80 bg-surface/90 p-2 text-xs dark:border-dark-border/80 dark:bg-dark-surface/80">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider text-muted dark:text-dark-muted">
              <GitBranch className="h-3 w-3 text-primary" />
              <span>Pipeline Prerequisites</span>
            </div>
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                <AlertTriangle className="h-3 w-3" />
                Blocked
              </span>
            ) : allPrereqsDone ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" />
                Ready
              </span>
            ) : null}
          </div>

          {/* List of prerequisites */}
          <div className="space-y-1">
            {dependencies.map((dep, idx) => {
              const isDepDone = dep.status === 'done';
              const depAssignee = dep.assignedTo?.username || dep.assignedToSnapshot?.username || 'unassigned';

              return (
                <div
                  key={dep._id || idx}
                  className={`flex items-start gap-1.5 rounded p-1 text-[11px] ${
                    isDepDone
                      ? 'bg-success/5 text-success dark:bg-success/10'
                      : 'bg-warning/10 text-warning-foreground dark:text-warning'
                  }`}
                >
                  {isDepDone ? (
                    <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-medium line-clamp-1">{dep.title || 'Untitled prerequisite'}</span>
                    <span className="text-[10px] opacity-80">
                      (@{depAssignee} · {statusLabel(dep.status)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Downstream Impact: Which tasks depend on THIS task ──────────────────────── */}
      {downstreamTasks.length > 0 && (
        <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-xs dark:bg-primary/10">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <ArrowUpRight className="h-3 w-3" />
            <span>Unlocks {downstreamTasks.length} Downstream Task{downstreamTasks.length === 1 ? '' : 's'}</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] text-foreground dark:text-dark-foreground">
            {downstreamTasks.map((down) => (
              <li key={down._id} className="flex items-center gap-1 truncate opacity-90">
                <span className="text-primary font-bold">↳</span>
                <span className="truncate">{down.title}</span>
                <span className="text-[10px] text-muted dark:text-dark-muted shrink-0">
                  (@{down.assignedTo?.username || 'unassigned'})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

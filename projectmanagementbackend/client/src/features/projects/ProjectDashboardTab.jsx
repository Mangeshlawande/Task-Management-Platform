import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, ListTodo, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { projectsApi } from '../../api/projects.js';
import { ApiError } from '../../api/client.js';
import { Avatar, Badge, Skeleton } from '../../components/ui/index.js';
import { fromNow, statusBadgeVariant, statusLabel } from '../../lib/format.js';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import { StatusBreakdownChart } from './StatusBreakdownChart.jsx';
import { useCacheStore } from '../../stores/cacheStore.js';
import { ActivityFeed } from '../../components/common/ActivityFeed.jsx';
import { buildProjectActivities } from '../../lib/activityService.js';
import { useLiveSync } from '../../lib/useLiveSync.js';

/**
 * Dashboard tab — the shell's index route.
 * P5.1 scope (stat cards / member count / recent tasks) lives here, plus the
 * hand-rolled status donut (docs/07 § 2.4). Numbers come from the dedicated
 * dashboard endpoint so they match the kanban exactly without aggregating
 * client-side.
 *
 * Uses memory cache and project shell tasks for instant 0ms render.
 */
export function ProjectDashboardTab() {
  const { project, members, tasks } = useProject();
  const cached = useCacheStore.getState().get(`/api/v1/projects/${project._id}/dashboard`);

  // Fast client-side derivation from already loaded project shell data if cached is not yet set
  const derivedStats = tasks ? {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
  } : null;

  const initialData = cached || (derivedStats ? {
    project: { _id: project._id, name: project.name },
    stats: derivedStats,
    memberCount: members?.length || project?.members || 1,
    recentTasks: [...tasks].slice(0, 5),
  } : null);

  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState(initialData ? 'ready' : 'loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load(silent = false) {
      if (!silent) setStatus('loading');
      setError(null);
      try {
        const payload = await projectsApi.dashboard(project._id);
        if (!cancelled) {
          setData(payload);
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled && !silent) {
          setError(err instanceof ApiError ? err.message : 'Could not load the dashboard.');
          setStatus('error');
        }
      }
    }

    load(Boolean(initialData));
    return () => {
      cancelled = true;
    };
  }, [project._id, Boolean(initialData)]);

  useLiveSync({
    enabled: Boolean(project?._id),
    intervalMs: 30000,
    onSync: () => {
      projectsApi.dashboard(project._id).then(setData).catch(() => {});
    },
  });

  const activities = useMemo(() => {
    return buildProjectActivities({ tasks: tasks || [], members: members || [], project });
  }, [tasks, members, project]);

  if (status === 'loading') {
    return (
      <div className="space-y-4 w-full" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full min-w-0 app-card p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full app-card p-6 text-sm text-danger" role="alert">
        {error}
      </div>
    );
  }

  const { stats, memberCount, recentTasks } = data;

  const cards = [
    { label: 'To Do', value: stats.todo, icon: ListTodo, tone: 'text-muted' },
    { label: 'In Progress', value: stats.in_progress, icon: Clock, tone: 'text-primary dark:text-dark-primary' },
    { label: 'Done', value: stats.done, icon: CheckCircle2, tone: 'text-success' },
    { label: 'Members', value: memberCount, icon: Users, tone: 'text-foreground dark:text-dark-foreground' },
  ];

  const progress =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-4 w-full">
      {/* ── Key Metrics Cards (Animated - Displayed first) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {cards.map(({ label, value, icon: Icon, tone }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
            className="w-full min-w-0 app-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted dark:text-dark-muted">{label}</span>
              <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-semibold text-foreground dark:text-dark-foreground">
              {value}
            </p>
          </motion.div>
        ))}
      </div>

      <StatusBreakdownChart stats={stats} />

      <div className="w-full min-w-0 app-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground dark:text-dark-foreground">
            Progress
          </span>
          <span className="text-muted dark:text-dark-muted">
            {stats.done} of {stats.total} task{stats.total === 1 ? '' : 's'} done ·{' '}
            {progress}%
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-border/60 dark:bg-dark-border/50"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Task completion"
        >
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {/* Recent Tasks */}
        <div className="w-full min-w-0 app-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-foreground dark:text-dark-foreground">
              Recent tasks
            </h2>
            <Link
              to="board"
              className="text-xs text-muted transition hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
            >
              Open board →
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted dark:text-dark-muted">
              <Circle className="mx-auto mb-2 h-6 w-6" aria-hidden />
              No tasks yet — create the first one in the tasks section.
            </p>
          ) : (
            <ul className="divide-y divide-border dark:divide-dark-border">
              {recentTasks.map((task) => (
                <li key={task._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground dark:text-dark-foreground">
                      {task.title}
                    </span>
                    <span className="text-xs text-muted dark:text-dark-muted">
                      Updated {fromNow(task.updatedAt)}
                    </span>
                  </span>
                  {task.assignedTo && <Avatar user={task.assignedTo} size="sm" />}
                  <Badge variant={statusBadgeVariant(task.status)}>
                    {statusLabel(task.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Project Activity Feed */}
        <ActivityFeed
          activities={activities}
          title="Project Activity"
          emptyMessage="No activity in this project yet."
          className="w-full min-w-0"
        />
      </div>
    </div>
  );
}

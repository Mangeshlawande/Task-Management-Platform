import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { tasksApi } from '../../api/tasks.js';

/**
 * Owns the task list for the board (docs/05 P3).
 * status: loading | ready | error.
 *
 * Moves are optimistic — the card changes column immediately and rolls back
 * if the API rejects (403 for a member moving someone else's task, 404 if it
 * was deleted meanwhile). The caller turns the rejection into a toast.
 */
export function useBoardTasks(projectId) {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setTasks(await tasksApi.list(projectId));
      setStatus('ready');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load tasks.',
      );
      setStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /** POST multipart → prepended (the API returns newest-first). */
  const createTask = useCallback(
    async (formData) => {
      const created = await tasksApi.create(projectId, formData);
      setTasks((list) => [created, ...list]);
      return created;
    },
    [projectId],
  );

  /** Optimistic status move with rollback on failure. */
  const moveTask = useCallback(
    async (task, nextStatus) => {
      if (task.status === nextStatus) return task;
      const previous = task.status;

      setTasks((list) =>
        list.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t)),
      );

      try {
        const updated = await tasksApi.update(projectId, task._id, {
          status: nextStatus,
        });
        setTasks((list) =>
          list.map((t) => (t._id === task._id ? updated : t)),
        );
        return updated;
      } catch (err) {
        setTasks((list) =>
          list.map((t) =>
            t._id === task._id ? { ...t, status: previous } : t,
          ),
        );
        throw err;
      }
    },
    [projectId],
  );

  /** Merge a saved Task from the detail modal into the board row. */
  const patchTask = useCallback((taskId, patch) => {
    setTasks((list) =>
      list.map((t) => (t._id === taskId ? { ...t, ...patch } : t)),
    );
  }, []);

  const removeTask = useCallback(async (taskId) => {
    setTasks((list) => list.filter((t) => t._id !== taskId));
  }, []);

  return {
    tasks,
    status,
    error,
    reload: load,
    createTask,
    moveTask,
    patchTask,
    removeTask,
  };
}

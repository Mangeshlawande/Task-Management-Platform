import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { tasksApi } from '../../api/tasks.js';
import { useCacheStore } from '../../stores/cacheStore.js';

/**
 * Owns the task list for the board (docs/05 P3).
 * status: loading | ready | error.
 *
 * Uses memory cache and project shell tasks for instant 0ms render.
 * Moves are optimistic — the card changes column immediately and rolls back
 * if the API rejects.
 */
export function useBoardTasks(projectId, initialTasks = []) {
  const cached = useCacheStore.getState().get(`/api/v1/projects/${projectId}/tasks`);
  const initial = Array.isArray(initialTasks) && initialTasks.length > 0 ? initialTasks : (cached || []);
  const [tasks, setTasks] = useState(initial);
  const [status, setStatus] = useState(
    (Array.isArray(initialTasks) && initialTasks.length > 0) || cached !== null ? 'ready' : 'loading'
  );
  const [error, setError] = useState(null);

  // Sync if parent updates initialTasks
  useEffect(() => {
    if (Array.isArray(initialTasks) && initialTasks.length > 0) {
      setTasks(initialTasks);
      setStatus('ready');
    }
  }, [initialTasks]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setError(null);
    try {
      const data = await tasksApi.list(projectId);
      setTasks(data);
      setStatus('ready');
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiError ? err.message : 'Could not load tasks.',
        );
        setStatus('error');
      }
    }
  }, [projectId]);

  useEffect(() => {
    const hasInitial = (Array.isArray(initialTasks) && initialTasks.length > 0) || cached !== null;
    load(hasInitial);
  }, [projectId, load]);

  /** POST multipart → prepended (the API returns newest-first). */
  const createTask = useCallback(
    async (formData) => {
      const created = await tasksApi.create(projectId, formData);
      setTasks((list) => {
        const nextList = [created, ...list];
        useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, nextList);
        return nextList;
      });
      return created;
    },
    [projectId],
  );

  /** Optimistic status move with rollback on failure. */
  const moveTask = useCallback(
    async (task, nextStatus) => {
      if (task.status === nextStatus) return task;
      const previous = task.status;

      setTasks((list) => {
        const nextList = list.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t));
        useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, nextList);
        return nextList;
      });

      try {
        const updated = await tasksApi.update(projectId, task._id, {
          status: nextStatus,
        });
        setTasks((list) => {
          const nextList = list.map((t) => (t._id === task._id ? updated : t));
          useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, nextList);
          return nextList;
        });
        return updated;
      } catch (err) {
        setTasks((list) => {
          const rollbackList = list.map((t) =>
            t._id === task._id ? { ...t, status: previous } : t,
          );
          useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, rollbackList);
          return rollbackList;
        });
        throw err;
      }
    },
    [projectId],
  );

  /** Merge a saved Task from the detail modal into the board row. */
  const patchTask = useCallback((taskId, patch) => {
    setTasks((list) => {
      const nextList = list.map((t) => (t._id === taskId ? { ...t, ...patch } : t));
      useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, nextList);
      return nextList;
    });
  }, [projectId]);

  const removeTask = useCallback(async (taskId) => {
    setTasks((list) => {
      const nextList = list.filter((t) => t._id !== taskId);
      useCacheStore.getState().set(`/api/v1/projects/${projectId}/tasks`, nextList);
      return nextList;
    });
  }, [projectId]);

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

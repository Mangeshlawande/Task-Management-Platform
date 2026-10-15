import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { projectsApi } from '../../api/projects.js';
import { tasksApi } from '../../api/tasks.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useCacheStore } from '../../stores/cacheStore.js';

/**
 * Owns one project + its members and tasks for the shell (docs/02: features keep their
 * own hooks; `api/` stays React-free). status: loading | ready | error.
 *
 * `myRole` is derived from the members list — the authoritative project-scoped
 * role — falling back to the role embedded in GET /projects list items.
 *
 * Pre-populates from Zustand cache to eliminate skeleton flashes during tab/route transitions.
 */
export function useProjectDetail(projectId, fallbackRole = null) {
  const cachedProject = useCacheStore.getState().get(`/api/v1/projects/${projectId}`);
  const cachedMembers = useCacheStore.getState().get(`/api/v1/projects/${projectId}/members`);
  const cachedTasks = useCacheStore.getState().get(`/api/v1/projects/${projectId}/tasks`);
  const hasCache = Boolean(cachedProject);

  const [project, setProject] = useState(cachedProject || null);
  const [members, setMembers] = useState(cachedMembers || []);
  const [tasks, setTasks] = useState(cachedTasks || []);
  const [status, setStatus] = useState(hasCache ? 'ready' : 'loading');
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setError(null);

    try {
      const [projectData, membersData, tasksData] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.listMembers(projectId),
        tasksApi.list(projectId).catch(() => []),
      ]);
      setProject(projectData);
      setMembers(membersData || []);
      setTasks(tasksData || []);
      setStatus('ready');
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiError ? err.message : 'Could not load this project.',
        );
        setStatus('error');
      }
    }
  }, [projectId]);

  useEffect(() => {
    load(hasCache);
  }, [load, hasCache]);

  const currentUserId = useAuthStore((s) => s.user?._id);

  /** My project-scoped role: members list first, list-item fallback second. */
  let myRole = fallbackRole;
  if (Array.isArray(members) && currentUserId) {
    myRole = members.find((m) => m.user?._id === currentUserId)?.role ?? fallbackRole;
  }

  /**
   * PUT /projects/:id — applies the patch locally so the settings tab and the
   * shell header stay in sync without a refetch.
   */
  const updateProject = useCallback(
    async (patch) => {
      const updated = await projectsApi.update(projectId, patch);
      setProject(updated);
      return updated;
    },
    [projectId],
  );

  const removeProject = useCallback(
    () => projectsApi.remove(projectId),
    [projectId],
  );

  /** POST /members — upsert by email; refresh the list to get populated users. */
  const addMember = useCallback(
    async ({ email, role }) => {
      await projectsApi.addMember(projectId, { email, role });
      setMembers(await projectsApi.listMembers(projectId));
    },
    [projectId],
  );

  const updateMemberRole = useCallback(
    async (userId, role) => {
      await projectsApi.updateMemberRole(projectId, userId, role);
      setMembers((list) =>
        list.map((m) => (m.user._id === userId ? { ...m, role } : m)),
      );
    },
    [projectId],
  );

  const removeMember = useCallback(
    async (userId) => {
      await projectsApi.removeMember(projectId, userId);
      setMembers((list) => list.filter((m) => m.user._id !== userId));
    },
    [projectId],
  );

  return {
    project,
    members,
    tasks,
    myRole,
    status,
    error,
    reload: load,
    updateProject,
    removeProject,
    addMember,
    updateMemberRole,
    removeMember,
  };
}

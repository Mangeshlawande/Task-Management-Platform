import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { projectsApi } from '../../api/projects.js';
import { useAuthStore } from '../../stores/authStore.js';

/**
 * Owns one project + its members for the shell (docs/02: features keep their
 * own hooks; `api/` stays React-free). status: loading | ready | error.
 *
 * `myRole` is derived from the members list — the authoritative project-scoped
 * role — falling back to the role embedded in GET /projects list items.
 */
export function useProjectDetail(projectId, fallbackRole = null) {
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const [projectData, membersData] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.listMembers(projectId),
      ]);
      setProject(projectData);
      setMembers(membersData);
      setStatus('ready');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load this project.',
      );
      setStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

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

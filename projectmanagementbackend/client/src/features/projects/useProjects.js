import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { projectsApi } from '../../api/projects.js';

/**
 * Owns the projects list for this feature (docs/02: features keep their own
 * hooks; `api/` stays React-free). status: loading | ready | error.
 */
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      setProjects(await projectsApi.list());
      setStatus('ready');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load your projects.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * POST /projects answers with a bare Project, but the list renders
   * { role, project: { …members } } — so fill the gaps for the creator
   * (they are always the project's first admin).
   */
  const addProject = useCallback((project) => {
    setProjects((list) => [
      {
        role: 'admin',
        project: { ...project, members: project.members ?? 1 },
      },
      ...list,
    ]);
  }, []);

  return { projects, status, error, reload: load, addProject };
}
